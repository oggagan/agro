$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:5000/api/v1"

function Api {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Body = $null,
        [string]$Token = $null
    )
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    $params = @{
        Uri     = "$baseUrl$Path"
        Method  = $Method
        Headers = $headers
    }
    if ($Body) { $params["Body"] = $Body }
    try {
        $response = Invoke-WebRequest @params -UseBasicParsing
        return ($response.Content | ConvertFrom-Json)
    } catch {
        $err = $_.ErrorDetails.Message
        if ($err) { return ($err | ConvertFrom-Json) }
        Write-Host "  ERROR: $_" -ForegroundColor Red
        return $null
    }
}

function PrintResult($label, $result) {
    if ($result.success) {
        Write-Host "  PASS: $label" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: $label - $($result.error.message)" -ForegroundColor Red
    }
    $result | ConvertTo-Json -Depth 6 | Write-Host
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n========== AUTH MODULE ==========" -ForegroundColor Cyan

# 1. Send OTP
Write-Host "`n--- 1. Send OTP (SuperAdmin) ---"
$r = Api -Method POST -Path "/auth/send-otp" -Body '{"phone":"9999999999"}'
PrintResult "Send OTP" $r

# 2. Verify OTP
Write-Host "--- 2. Verify OTP ---"
$r = Api -Method POST -Path "/auth/verify-otp" -Body '{"phone":"9999999999","otp":"123456"}'
PrintResult "Verify OTP" $r

# 3. Login as SuperAdmin
Write-Host "--- 3. Login as SuperAdmin ---"
$r = Api -Method POST -Path "/auth/login" -Body '{"phone":"9999999999","password":"SuperAdmin@123"}'
PrintResult "Login" $r
$adminToken = $r.data.accessToken
$adminRefresh = $r.data.refreshToken
$adminUserId = $r.data.user.id
Write-Host "  Admin User ID: $adminUserId"

# 4. Refresh Token
Write-Host "--- 4. Refresh Token ---"
$refreshBody = @{ refreshToken = $adminRefresh } | ConvertTo-Json
$r = Api -Method POST -Path "/auth/refresh" -Body $refreshBody
PrintResult "Refresh" $r
$adminToken = $r.data.accessToken
$adminRefresh = $r.data.refreshToken

# 5. Validation error
Write-Host "--- 5. Validation Error ---"
$r = Api -Method POST -Path "/auth/send-otp" -Body '{"phone":"123"}'
if (-not $r.success) {
    Write-Host "  PASS: Validation correctly rejected invalid phone" -ForegroundColor Green
} else {
    Write-Host "  FAIL: Should have rejected" -ForegroundColor Red
}
$r | ConvertTo-Json -Depth 6 | Write-Host
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════
Write-Host "========== USER MODULE ==========" -ForegroundColor Cyan

# 6. Get own profile
Write-Host "`n--- 6. GET /users/me ---"
$r = Api -Method GET -Path "/users/me" -Token $adminToken
PrintResult "Get Profile" $r

# 7. Update own profile
Write-Host "--- 7. PATCH /users/me ---"
$r = Api -Method PATCH -Path "/users/me" -Token $adminToken -Body '{"name":"Super Admin Updated"}'
PrintResult "Update Profile" $r

# 8. List users
Write-Host "--- 8. GET /users ---"
$r = Api -Method GET -Path "/users" -Token $adminToken
PrintResult "List Users" $r
Write-Host "  Total users: $($r.meta.total)"

# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n========== MANUFACTURER MODULE (ADMIN) ==========" -ForegroundColor Cyan

# 9. Create manufacturer
Write-Host "`n--- 9. POST /manufacturers ---"
$createMfg = @{
    phone       = "8888888888"
    password    = "Mfg@12345678"
    name        = "Test Manufacturer"
    email       = "mfg@test.com"
    companyName = "Test Corp Pvt Ltd"
    companyType = "PVT_LTD"
    licenseNumber = "LIC-001"
    gstNumber   = "22AAAAA0000A1Z5"
    isDraft     = $false
    address     = @{
        address1 = "123 Industrial Area"
        city     = "Mumbai"
        state    = "Maharashtra"
        pincode  = "400001"
    }
    bankDetails = @{
        accountName   = "Test Corp Pvt Ltd"
        accountNumber = "1234567890123"
        ifscCode      = "SBIN0001234"
        bankName      = "State Bank of India"
    }
    directors   = @(
        @{
            type    = "DIRECTOR"
            name    = "Director One"
            phone   = "7777777777"
            email   = "dir1@test.com"
            designation = "Managing Director"
        }
    )
    authorizedPersons = @(
        @{
            name     = "Auth Person"
            phone    = "6666666666"
            password = "AuthPerson@123"
        }
    )
} | ConvertTo-Json -Depth 5
$r = Api -Method POST -Path "/manufacturers" -Token $adminToken -Body $createMfg
PrintResult "Create Manufacturer" $r
$mfgId = $r.data.id
$mfgUserId = $r.data.userId
Write-Host "  Manufacturer ID: $mfgId"
Write-Host "  Manufacturer User ID: $mfgUserId"

# 10. List manufacturers
Write-Host "--- 10. GET /manufacturers ---"
$r = Api -Method GET -Path "/manufacturers" -Token $adminToken
PrintResult "List Manufacturers" $r
Write-Host "  Total: $($r.meta.total)"

# 11. Get manufacturer by ID
Write-Host "--- 11. GET /manufacturers/$mfgId ---"
$r = Api -Method GET -Path "/manufacturers/$mfgId" -Token $adminToken
PrintResult "Get Manufacturer" $r
Write-Host "  Company: $($r.data.companyName)"

# 12. Update manufacturer
Write-Host "--- 12. PUT /manufacturers/$mfgId ---"
$updateBody = @{
    companyName = "Test Corp Updated Pvt Ltd"
    gstNumber   = "22BBBBB0000B1Z5"
} | ConvertTo-Json
$r = Api -Method PUT -Path "/manufacturers/$mfgId" -Token $adminToken -Body $updateBody
PrintResult "Update Manufacturer" $r

# 13. Change status to ACTIVE
Write-Host "--- 13. PATCH /manufacturers/$mfgId/status ---"
$r = Api -Method PATCH -Path "/manufacturers/$mfgId/status" -Token $adminToken -Body '{"status":"ACTIVE","reason":"Approved after review"}'
PrintResult "Activate Manufacturer" $r

# 14. Add another director
Write-Host "--- 14. POST /manufacturers/$mfgId/directors ---"
$dirBody = @{
    type  = "PARTNER"
    name  = "Partner Two"
    phone = "5555555555"
    email = "partner2@test.com"
} | ConvertTo-Json
$r = Api -Method POST -Path "/manufacturers/$mfgId/directors" -Token $adminToken -Body $dirBody
PrintResult "Add Director" $r
$newDirId = $r.data.id

# 15. Add authorized person with login, then update one
Write-Host "--- 15a. POST /manufacturers/$mfgId/authorized-persons (with login) ---"
$addApBody = @{
    name     = "Auth Person With Login"
    phone    = "6666666665"
    email    = "authperson@test.com"
    password = "AuthPerson@123"
} | ConvertTo-Json
$r = Api -Method POST -Path "/manufacturers/$mfgId/authorized-persons" -Token $adminToken -Body $addApBody
PrintResult "Add Authorized Person" $r
$apId = $r.data.id
Write-Host "--- 15b. PUT /manufacturers/$mfgId/authorized-persons/$apId ---"
$authPersonBody = @{
    name          = "Updated Auth Person"
    phone         = "6666666665"
    aadhaarNumber = "123456789012"
} | ConvertTo-Json
$r = Api -Method PUT -Path "/manufacturers/$mfgId/authorized-persons/$apId" -Token $adminToken -Body $authPersonBody
PrintResult "Update Authorized Person" $r

# 16. Update bank details
Write-Host "--- 16. PUT /manufacturers/$mfgId/bank-details ---"
$bankBody = @{
    accountName   = "Updated Test Corp"
    accountNumber = "9876543210123"
    ifscCode      = "HDFC0001234"
    bankName      = "HDFC Bank"
} | ConvertTo-Json
$r = Api -Method PUT -Path "/manufacturers/$mfgId/bank-details" -Token $adminToken -Body $bankBody
PrintResult "Update Bank Details" $r

# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n========== MANUFACTURER SELF-SERVICE ==========" -ForegroundColor Cyan

# 17. Send OTP for manufacturer
Write-Host "`n--- 17. Send OTP (Manufacturer) ---"
$r = Api -Method POST -Path "/auth/send-otp" -Body '{"phone":"8888888888"}'
PrintResult "Send OTP" $r

# 18. Verify OTP
Write-Host "--- 18. Verify OTP ---"
$r = Api -Method POST -Path "/auth/verify-otp" -Body '{"phone":"8888888888","otp":"123456"}'
PrintResult "Verify OTP" $r

# 19. Login as manufacturer
Write-Host "--- 19. Login as Manufacturer ---"
$r = Api -Method POST -Path "/auth/login" -Body '{"phone":"8888888888","password":"Mfg@12345678"}'
PrintResult "Login" $r
$mfgToken = $r.data.accessToken
$mfgRefreshToken = $r.data.refreshToken

# 20. Get own manufacturer profile
Write-Host "--- 20. GET /manufacturers/me ---"
$r = Api -Method GET -Path "/manufacturers/me" -Token $mfgToken
PrintResult "Get Own Profile" $r
Write-Host "  Company: $($r.data.companyName)"

# 21. Update own company details
Write-Host "--- 21. PUT /manufacturers/me ---"
$updateSelf = @{
    companyName = "Test Corp Self-Updated"
} | ConvertTo-Json
$r = Api -Method PUT -Path "/manufacturers/me" -Token $mfgToken -Body $updateSelf
PrintResult "Update Own Profile" $r

# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n========== CLEANUP ==========" -ForegroundColor Cyan

# 22. Logout manufacturer
Write-Host "`n--- 22. Logout Manufacturer ---"
$logoutBody = @{ refreshToken = $mfgRefreshToken } | ConvertTo-Json
$r = Api -Method POST -Path "/auth/logout" -Token $mfgToken -Body $logoutBody
PrintResult "Logout Manufacturer" $r

# 23. Soft-delete manufacturer user (as admin)
Write-Host "--- 23. DELETE /users/$mfgUserId ---"
$r = Api -Method DELETE -Path "/users/$mfgUserId" -Token $adminToken
PrintResult "Soft Delete Manufacturer" $r

# 24. Verify user is deleted (list should show fewer)
Write-Host "--- 24. Verify user list after delete ---"
$r = Api -Method GET -Path "/users" -Token $adminToken
PrintResult "List Users After Delete" $r
Write-Host "  Total users remaining: $($r.meta.total)"

# 25. Logout SuperAdmin
Write-Host "--- 25. Logout SuperAdmin ---"
$logoutAdmin = @{ refreshToken = $adminRefresh } | ConvertTo-Json
$r = Api -Method POST -Path "/auth/logout" -Token $adminToken -Body $logoutAdmin
PrintResult "Logout Admin" $r

Write-Host "`n========== ALL TESTS COMPLETE ==========" -ForegroundColor Yellow
