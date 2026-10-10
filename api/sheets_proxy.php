<?php
/**
 * ============================================================================
 * PerMAK — PHP Backend & Direct Google Sheets REST API v4 Bridge
 * Zero Google Apps Script Required!
 * Supports:
 *  1. Local Windows/PHP Server Database (data/permak_db.json)
 *  2. Direct Google Sheet Pull via Sheet ID / URL (gviz CSV — Zero Script)
 *  3. Direct Google Sheets REST API v4 2-Way Sync (sheets.googleapis.com)
 * ============================================================================
 */

error_reporting(0);
@ini_set('display_errors', '0');
@ini_set('html_errors', '0');
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

function sendJson($data) {
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    sendJson(['ok' => true]);
}

$dataDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0775, true);
}
$localDbFile = $dataDir . DIRECTORY_SEPARATOR . 'permak_db.json';
$serviceAccountFile = $dataDir . DIRECTORY_SEPARATOR . 'google_service_account.json';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : 'status';

if ($method === 'GET') {
    if ($action === 'status') {
        sendJson([
            'ok' => true,
            'phpActive' => true,
            'phpVersion' => PHP_VERSION,
            'hasLocalDb' => file_exists($localDbFile),
            'hasServiceAccount' => file_exists($serviceAccountFile),
            'serverTime' => date('c')
        ]);
    }

    if ($action === 'loadLocal') {
        if (file_exists($localDbFile)) {
            $raw = file_get_contents($localDbFile);
            $decoded = json_decode($raw, true);
            if ($decoded) {
                sendJson(['ok' => true, 'source' => 'php_local_db', 'data' => $decoded]);
            }
        }
        sendJson(['ok' => false, 'message' => 'No local server DB file yet']);
    }
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);

    if (!$payload) {
        sendJson(['ok' => false, 'error' => 'Invalid JSON payload']);
    }

    $reqAction = isset($payload['action']) ? $payload['action'] : 'saveLocal';

    // 1. Save to Local Windows/PHP Server JSON Database
    if ($reqAction === 'saveLocal' && isset($payload['data'])) {
        $written = @file_put_contents(
            $localDbFile,
            json_encode($payload['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
        sendJson([
            'ok' => $written !== false,
            'savedBytes' => $written ?: 0,
            'timestamp' => date('c')
        ]);
    }

    // 2. Save Google Service Account JSON Key (for Direct Google Sheets API v4 Write)
    if ($reqAction === 'saveServiceAccount' && !empty($payload['serviceAccountJson'])) {
        $saData = is_string($payload['serviceAccountJson'])
            ? json_decode($payload['serviceAccountJson'], true)
            : $payload['serviceAccountJson'];

        if (!$saData || empty($saData['client_email']) || empty($saData['private_key'])) {
            sendJson(['ok' => false, 'error' => 'Invalid Service Account JSON. Must contain client_email and private_key.']);
        }
        @file_put_contents($serviceAccountFile, json_encode($saData, JSON_PRETTY_PRINT));
        sendJson([
            'ok' => true,
            'clientEmail' => $saData['client_email'],
            'message' => 'Service Account saved! Share your Google Sheet with ' . $saData['client_email']
        ]);
    }

    // 3. Direct Pull from Google Sheet by Sheet URL / ID (Zero Apps Script)
    if ($reqAction === 'pullDirectSheetId' && !empty($payload['sheetInput'])) {
        $sheetId = extractSpreadsheetId($payload['sheetInput']);
        if (!$sheetId) {
            sendJson(['ok' => false, 'error' => 'Could not extract a valid Google Sheet ID from input.']);
        }

        // If Service Account is configured, pull via Official Google Sheets API v4
        if (file_exists($serviceAccountFile)) {
            $res = pullViaGoogleSheetsApiV4($sheetId, $serviceAccountFile);
            if ($res['ok']) {
                sendJson($res);
            }
        }

        // Otherwise pull directly via Google Sheets gviz CSV endpoint (Zero Script, Zero Key)
        $res = pullViaDirectGvizCsv($sheetId);
        sendJson($res);
    }

    // 4. Direct Push to Google Sheet via Official Google Sheets REST API v4 (Zero Apps Script)
    if ($reqAction === 'pushDirectSheetApiV4' && !empty($payload['sheetInput']) && isset($payload['data'])) {
        $sheetId = extractSpreadsheetId($payload['sheetInput']);
        if (!$sheetId) {
            sendJson(['ok' => false, 'error' => 'Invalid Google Sheet URL or ID.']);
        }

        // Always save locally first
        @file_put_contents(
            $localDbFile,
            json_encode($payload['data'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );

        if (!file_exists($serviceAccountFile) && empty($payload['serviceAccountJson'])) {
            sendJson([
                'ok' => false,
                'error' => 'Saved to local database! Note: To write back to Google Sheets without Apps Script, add a Google Cloud Service Account JSON key in Step 2 (or use File -> Import in Google Sheets).'
            ]);
        }

        if (!empty($payload['serviceAccountJson'])) {
            $saData = is_string($payload['serviceAccountJson'])
                ? json_decode($payload['serviceAccountJson'], true)
                : $payload['serviceAccountJson'];
            if ($saData && !empty($saData['client_email'])) {
                @file_put_contents($serviceAccountFile, json_encode($saData, JSON_PRETTY_PRINT));
            }
        }

        $res = pushViaGoogleSheetsApiV4($sheetId, $serviceAccountFile, $payload['data']);
        sendJson($res);
    }

    sendJson(['ok' => false, 'error' => 'Unsupported action']);
}

/**
 * Extract Spreadsheet ID from full Google Sheet URL or raw ID
 */
function extractSpreadsheetId($input) {
    $str = trim($input);
    if (preg_match('/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/', $str, $m)) {
        return $m[1];
    }
    if (preg_match('/^[a-zA-Z0-9-_]{20,60}$/', $str)) {
        return $str;
    }
    return null;
}

/**
 * Pull tabs directly from a shared Google Sheet using gviz CSV export (Zero Apps Script, Zero API Key)
 */
function pullViaDirectGvizCsv($sheetId) {
    $tabs = [
        'accounts' => 'Accounts_Master',
        'transactions' => 'Transactions',
        'recurringRules' => 'Recurring_Rules',
        'familyMembers' => 'Family_Members'
    ];

    $resultData = [];
    $anyFound = false;

    foreach ($tabs as $key => $tabName) {
        $url = "https://docs.google.com/spreadsheets/d/" . urlencode($sheetId) . "/gviz/tq?tqx=out:csv&sheet=" . urlencode($tabName);
        $csv = httpGet($url);
        if ($csv && strpos($csv, '<!DOCTYPE html>') === false && strpos($csv, '<html') === false) {
            $rows = parseCsvToObjects($csv);
            if (count($rows) > 0) {
                $anyFound = true;
            }
            $resultData[$key] = $rows;
        } else {
            $resultData[$key] = [];
        }
    }

    if (!$anyFound) {
        return [
            'ok' => false,
            'error' => 'Could not read tabs from Google Sheet. Make sure the Sheet sharing is set to "Anyone with the link can view", and has tabs named Accounts_Master, Transactions, Recurring_Rules, Family_Members.'
        ];
    }

    return [
        'ok' => true,
        'mode' => 'Direct Google Sheet CSV (Zero Apps Script)',
        'spreadsheetUrl' => "https://docs.google.com/spreadsheets/d/{$sheetId}/edit",
        'data' => normalizePulledData($resultData)
    ];
}

/**
 * Native PHP Google OAuth2 Access Token from Service Account JSON (using openssl_sign RS256)
 */
function getGoogleAccessToken($saFilePath) {
    $sa = json_decode(file_get_contents($saFilePath), true);
    if (!$sa || empty($sa['client_email']) || empty($sa['private_key'])) {
        throw new Exception("Invalid Service Account JSON file.");
    }

    $now = time();
    $header = base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claim = base64UrlEncode(json_encode([
        'iss' => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/spreadsheets',
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $now + 3600,
        'iat' => $now
    ]));

    $signingInput = $header . '.' . $claim;
    $signature = '';
    if (!openssl_sign($signingInput, $signature, $sa['private_key'], 'SHA256')) {
        throw new Exception("OpenSSL failed to sign JWT with private_key.");
    }

    $jwt = $signingInput . '.' . base64UrlEncode($signature);

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt
    ]));
    $resp = curl_exec($ch);

    $json = json_decode($resp, true);
    if (empty($json['access_token'])) {
        $errMsg = isset($json['error_description']) ? $json['error_description'] : $resp;
        throw new Exception("Google OAuth2 Token Error: " . $errMsg);
    }
    return $json['access_token'];
}

/**
 * Push all PerMAK tables directly to Google Sheets API v4 (Zero Apps Script)
 */
function pushViaGoogleSheetsApiV4($sheetId, $saFilePath, $data) {
    try {
        $token = getGoogleAccessToken($saFilePath);

        $metaUrl = "https://sheets.googleapis.com/v4/spreadsheets/" . urlencode($sheetId);
        $metaResp = json_decode(httpRequestJson($metaUrl, 'GET', null, $token), true);
        if (isset($metaResp['error'])) {
            return ['ok' => false, 'error' => 'Google Sheets API Error: ' . ($metaResp['error']['message'] ?? 'Check if sheet is shared with Service Account email')];
        }

        $existingTabs = [];
        foreach (($metaResp['sheets'] ?? []) as $sh) {
            $existingTabs[$sh['properties']['title']] = true;
        }

        $schema = getTabHeadersSchema();
        $addSheetRequests = [];
        foreach (array_keys($schema) as $tabTitle) {
            if (!isset($existingTabs[$tabTitle])) {
                $addSheetRequests[] = ['addSheet' => ['properties' => ['title' => $tabTitle]]];
            }
        }

        if (count($addSheetRequests) > 0) {
            httpRequestJson(
                "https://sheets.googleapis.com/v4/spreadsheets/" . urlencode($sheetId) . ":batchUpdate",
                'POST',
                ['requests' => $addSheetRequests],
                $token
            );
        }

        $valueData = [];
        $tabMapping = [
            'Accounts_Master' => $data['accounts'] ?? [],
            'Transactions' => $data['transactions'] ?? [],
            'Recurring_Rules' => $data['recurringRules'] ?? [],
            'Family_Members' => $data['familyMembers'] ?? []
        ];

        foreach ($tabMapping as $tabName => $items) {
            $cols = $schema[$tabName];
            $rows = [$cols];
            foreach ($items as $item) {
                $r = [];
                foreach ($cols as $col) {
                    $r[] = isset($item[$col]) ? (string)$item[$col] : '';
                }
                $rows[] = $r;
            }

            httpRequestJson(
                "https://sheets.googleapis.com/v4/spreadsheets/" . urlencode($sheetId) . "/values/" . urlencode($tabName . "!A1:Z10000") . ":clear",
                'POST',
                new stdClass(),
                $token
            );

            $valueData[] = [
                'range' => $tabName . '!A1',
                'values' => $rows
            ];
        }

        $batchUrl = "https://sheets.googleapis.com/v4/spreadsheets/" . urlencode($sheetId) . "/values:batchUpdate";
        $batchResp = json_decode(httpRequestJson($batchUrl, 'POST', [
            'valueInputOption' => 'USER_ENTERED',
            'data' => $valueData
        ], $token), true);

        if (isset($batchResp['error'])) {
            return ['ok' => false, 'error' => $batchResp['error']['message']];
        }

        return [
            'ok' => true,
            'spreadsheetName' => $metaResp['properties']['title'] ?? 'PerMAK Sheet',
            'spreadsheetUrl' => "https://docs.google.com/spreadsheets/d/{$sheetId}/edit",
            'message' => 'Synced directly via Google Sheets REST API v4 (Zero Apps Script)!'
        ];
    } catch (Exception $e) {
        return ['ok' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Pull all PerMAK tables via Official Google Sheets REST API v4
 */
function pullViaGoogleSheetsApiV4($sheetId, $saFilePath) {
    try {
        $token = getGoogleAccessToken($saFilePath);
        $ranges = [
            'ranges=Accounts_Master!A1:Z5000',
            'ranges=Transactions!A1:Z10000',
            'ranges=Recurring_Rules!A1:Z1000',
            'ranges=Family_Members!A1:Z200'
        ];
        $url = "https://sheets.googleapis.com/v4/spreadsheets/" . urlencode($sheetId) . "/values:batchGet?" . implode('&', $ranges);
        $resp = json_decode(httpRequestJson($url, 'GET', null, $token), true);

        if (isset($resp['error'])) {
            return ['ok' => false, 'error' => $resp['error']['message']];
        }

        $valueRanges = $resp['valueRanges'] ?? [];
        $keys = ['accounts', 'transactions', 'recurringRules', 'familyMembers'];
        $rawResult = [];

        foreach ($keys as $idx => $key) {
            $matrix = $valueRanges[$idx]['values'] ?? [];
            $rawResult[$key] = matrixToObjects($matrix);
        }

        return [
            'ok' => true,
            'mode' => 'Google Sheets REST API v4',
            'spreadsheetUrl' => "https://docs.google.com/spreadsheets/d/{$sheetId}/edit",
            'data' => normalizePulledData($rawResult)
        ];
    } catch (Exception $e) {
        return ['ok' => false, 'error' => $e->getMessage()];
    }
}

function getTabHeadersSchema() {
    return [
        'Accounts_Master' => [
            'id', 'code', 'name', 'nature', 'groupId', 'subType', 'invCategory',
            'openingBalance', 'openingType', 'memberId', 'accountNo', 'institution',
            'interestRate', 'maturityDate', 'currentMarketValue', 'notes'
        ],
        'Transactions' => [
            'id', 'voucherNo', 'date', 'voucherType', 'debitAccountId',
            'creditAccountId', 'amount', 'paymentMode', 'memberId', 'narration', 'refNo'
        ],
        'Recurring_Rules' => [
            'id', 'title', 'category', 'voucherType', 'debitAccountId', 'creditAccountId',
            'amount', 'frequency', 'dayOfMonth', 'nextDueDate', 'lastPostedDate',
            'paymentMode', 'memberId', 'narration', 'active'
        ],
        'Family_Members' => [
            'id', 'name', 'shortName', 'relation', 'avatar', 'color', 'notes'
        ]
    ];
}

function normalizePulledData($raw) {
    $accounts = array_map(function ($a) {
        $a['openingBalance'] = isset($a['openingBalance']) ? (float)$a['openingBalance'] : 0;
        $a['interestRate'] = isset($a['interestRate']) ? (float)$a['interestRate'] : 0;
        $a['currentMarketValue'] = isset($a['currentMarketValue']) ? (float)$a['currentMarketValue'] : 0;
        return $a;
    }, $raw['accounts'] ?? []);

    $transactions = array_map(function ($t) {
        $t['amount'] = isset($t['amount']) ? (float)$t['amount'] : 0;
        return $t;
    }, $raw['transactions'] ?? []);

    $recurringRules = array_map(function ($r) {
        $r['amount'] = isset($r['amount']) ? (float)$r['amount'] : 0;
        $r['dayOfMonth'] = isset($r['dayOfMonth']) ? (int)$r['dayOfMonth'] : 1;
        $r['active'] = !isset($r['active']) || strtolower((string)$r['active']) !== 'false';
        return $r;
    }, $raw['recurringRules'] ?? []);

    return [
        'accounts' => $accounts,
        'transactions' => $transactions,
        'recurringRules' => $recurringRules,
        'familyMembers' => $raw['familyMembers'] ?? []
    ];
}

function parseCsvToObjects($csvString) {
    $lines = preg_split('/\r\n|\r|\n/', trim($csvString));
    if (count($lines) <= 1) return [];
    $headers = str_getcsv(array_shift($lines), ',', '"', '\\');
    $items = [];
    foreach ($lines as $line) {
        if (trim($line) === '') continue;
        $row = str_getcsv($line, ',', '"', '\\');
        if (empty($row[0])) continue;
        $obj = [];
        foreach ($headers as $i => $h) {
            $obj[trim($h)] = isset($row[$i]) ? $row[$i] : '';
        }
        $items[] = $obj;
    }
    return $items;
}

function matrixToObjects($matrix) {
    if (count($matrix) <= 1) return [];
    $headers = $matrix[0];
    $items = [];
    for ($r = 1; $r < count($matrix); $r++) {
        $row = $matrix[$r];
        if (empty($row[0])) continue;
        $obj = [];
        foreach ($headers as $i => $h) {
            $obj[trim($h)] = isset($row[$i]) ? $row[$i] : '';
        }
        $items[] = $obj;
    }
    return $items;
}

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function httpGet($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    return curl_exec($ch);
}

function httpRequestJson($url, $method, $payload, $bearerToken) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 25);

    $headers = ['Authorization: Bearer ' . $bearerToken];
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        $jsonBody = json_encode($payload);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
        $headers[] = 'Content-Type: application/json';
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    return curl_exec($ch);
}
