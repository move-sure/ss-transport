import React from 'react';
import { X, Image, ImageOff } from 'lucide-react';

const ImagePreviewModal = React.memo(function ImagePreviewModal({ previewImage, onClose }) {
  if (!previewImage) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg"><Image className="h-4 w-4 text-indigo-600"/></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Bilty Image</h3>
              <p className="text-[10px] text-gray-500">GR: <b className="text-indigo-700">{previewImage.gr}</b> <span className={`ml-1 px-1 py-0.5 rounded text-[8px] font-bold ${previewImage.type === 'MNL' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{previewImage.type}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={previewImage.url} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Open Full</a>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500"/></button>
          </div>
        </div>
        <div className="p-4 bg-gray-50 flex items-center justify-center" style={{ maxHeight: 'calc(90vh - 60px)' }}>
          <img
            src={previewImage.url}
            alt={`Bilty ${previewImage.gr}`}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className="hidden flex-col items-center justify-center py-10 text-gray-400">
            <ImageOff className="h-12 w-12 mb-2"/>
            <p className="text-sm font-semibold">Image could not be loaded</p>
            <a href={previewImage.url} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-indigo-600 underline">Try opening directly</a>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ImagePreviewModal;
