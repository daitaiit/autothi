@echo off
chcp 65001 >nul
title Cập Nhật AutoThi AI Lên Bản Mới Nhất - Đại Tài
color 0A

echo ================================================================
echo    CHƯƠNG TRÌNH TỰ ĐỘNG CẬP NHẬT AUTOTHI AI - ĐẠI TÀI
echo ================================================================
echo.
echo  Đang tải phiên bản mã nguồn mới nhất từ GitHub...
echo.

set "ZIP_URL=https://raw.githubusercontent.com/daitaiit/autothi/main/AutoThi-Extension.zip"
set "TEMP_ZIP=%~dp0AutoThi_Update_Temp.zip"
set "TARGET_DIR=%~dp0"

powershell -NoProfile -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "$wc = New-Object System.Net.WebClient; " ^
  "Write-Host ' Đang tải file cập nhật...'; " ^
  "$wc.DownloadFile('%ZIP_URL%', '%TEMP_ZIP%'); " ^
  "Write-Host ' Đang giải nén và cập nhật tính năng mới...'; " ^
  "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%TARGET_DIR%' -Force; " ^
  "Remove-Item '%TEMP_ZIP%' -Force; " ^
  "Write-Host ' Cập nhật thành công!' -ForegroundColor Green"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================
    echo  ✓ ĐÃ TẢI VÀ NÂNG CẤP XONG TOÀN BỘ TÍNH NĂNG MỚI!
    echo ================================================================
    echo.
    echo  Đang mở trang tiện ích trình duyệt...
    start chrome chrome://extensions/ 2>nul || start msedge edge://extensions/ 2>nul
    echo.
    echo  BƯỚC CUỐI CÙNG:
    echo  Trên trang tiện ích vừa mở, hãy tìm ô "AutoThi AI"
    echo  và bấm vào biểu tượng nút "Tải lại" (mũi tên xoay tròn 🔄)
    echo  để trình duyệt nạp các tính năng mới ngay lập tức!
    echo.
) else (
    echo.
    echo  [X] Có lỗi khi tải bản cập nhật. Vui lòng kiểm tra kết nối mạng!
)

echo.
pause
