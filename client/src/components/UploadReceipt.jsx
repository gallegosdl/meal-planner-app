import React from 'react';

const UploadReceipt = ({ handleReceiptUpload, isParsingReceipt, receiptItems }) => (
  <div className="bg-[#252B3B]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#ffffff0f]">
    <h3 className="text-sm text-gray-400 mb-4">Upload Receipt</h3>
    <div className="flex items-center gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleReceiptUpload}
        className="hidden"
        id="receipt-upload"
      />
      <label
        htmlFor="receipt-upload"
        className="px-4 py-2 bg-[#2A3142] rounded-lg cursor-pointer hover:bg-[#313748] transition-colors"
      >
        Select Receipt Image
      </label>
      {isParsingReceipt && <span className="text-gray-400">Parsing receipt...</span>}
    </div>
    {receiptItems.length > 0 && (
      <div className="mt-4">
        <h4 className="text-sm text-gray-400 mb-2">Detected Items:</h4>
        <div className="grid grid-cols-2 gap-2">
          {receiptItems.map((item, index) => (
            <div key={index} className="bg-[#2A3142] p-2 rounded">
              <div className="text-sm">{item.name}</div>
              <div className="text-xs text-gray-400">${item.price}</div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default UploadReceipt; 