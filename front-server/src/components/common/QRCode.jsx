import React from "react";
import { QRCodeCanvas } from "qrcode.react";

const QRCodeDisplay = ({ url }) => {
  return (
    <div className="p-4 flex flex-col items-center">
      <h2 className="text-lg mb-2">QR 코드로 접속하기</h2>
      <QRCodeCanvas
        value={url}
        size={200}              // QR 코드 크기
        bgColor="#ffffff"       // 배경 색
        fgColor="#000000"       // QR 코드 색
        level="H"               // 오류 수정 레벨
      />
      <p className="text-sm mt-2 break-all">{url}</p>
    </div>
  );
};

export default QRCodeDisplay;
