@echo off
chcp 65001 >nul
title Hướng dẫn cài đặt AutoThi AI - Đại Tài
color 0B

echo ================================================================
echo    CHƯƠNG TRÌNH HỖ TRỢ CÀI ĐẶT AUTOTHI AI - ĐẠI TÀI
echo ================================================================
echo.
echo  Đang mở trang quản lý tiện ích trên trình duyệt của bạn...
echo.

start chrome chrome://extensions/ 2>nul || start msedge edge://extensions/ 2>nul

echo ----------------------------------------------------------------
echo  CÁC BƯỚC CÀI ĐẶT CỰC KỲ ĐƠN GIẢN (CHỈ MẤT 10 GIÂY):
echo ----------------------------------------------------------------
echo.
echo  Bước 1: Bật công tắc "Chế độ dành cho nhà phát triển" (Developer mode)
echo          ở góc trên bên phải màn hình trình duyệt.
echo.
echo  Bước 2: Bấm nút "Tải tiện ích đã giải nén" (Load unpacked)
echo          ở góc trên bên trái.
echo.
echo  Bước 3: Chọn thư mục chứa tiện ích này:
echo          "%~dp0"
echo.
echo ================================================================
echo  XONG! Tiện ích AutoThi AI đã sẵn sàng hoạt động 100%%.
echo ================================================================
echo.
pause
