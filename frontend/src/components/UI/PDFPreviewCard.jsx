import { useMemo, useState } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PDFPreviewCard({ fileUrl, fileName, onClose }) {
	const [pageNumber, setPageNumber] = useState(1);
	const [zoom, setZoom] = useState(100);

	const previewUrl = useMemo(() => {
		if (!fileUrl) return '';
		return `${fileUrl}#page=${pageNumber}&zoom=${zoom}`;
	}, [fileUrl, pageNumber, zoom]);

	const handlePrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
	const handleNextPage = () => setPageNumber((p) => p + 1);
	const handleZoomIn = () => setZoom((z) => Math.min(z + 20, 300));
	const handleZoomOut = () => setZoom((z) => Math.max(z - 20, 50));

	return (
		<div style={{
			position: 'fixed',
			inset: 0,
			background: 'rgba(22, 11, 53, 0.72)',
			backdropFilter: 'blur(2px)',
			zIndex: 4200,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 20,
		}} onClick={onClose}>
			<div
				style={{
					background: '#fff',
					borderRadius: 12,
					boxShadow: '0 18px 40px rgba(14, 6, 38, 0.45)',
					width: 'min(96vw, 1100px)',
					height: 'min(92vh, 820px)',
					position: 'relative',
					padding: 0,
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
				}}
				onClick={e => e.stopPropagation()}
			>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #ece3ff', background: '#f8f6ff', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
					<span style={{ fontWeight: 700, color: '#4b3b9a', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{fileName || 'Visualização PDF'}</span>
					<button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 22, cursor: 'pointer', borderRadius: 6, padding: 2 }} title="Fechar"><X size={22} /></button>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f8f6ff', borderBottom: '1px solid #ece3ff' }}>
					<button onClick={handlePrevPage} disabled={pageNumber <= 1} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 18, cursor: 'pointer', opacity: pageNumber <= 1 ? 0.4 : 1 }} title="Página anterior"><ChevronLeft /></button>
					<span style={{ fontSize: 13, color: '#4b3b9a', fontWeight: 600 }}>Página {pageNumber}</span>
					<button onClick={handleNextPage} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 18, cursor: 'pointer' }} title="Próxima página"><ChevronRight /></button>
					<span style={{ marginLeft: 18, marginRight: 2, color: '#4b3b9a', fontSize: 13 }}>{zoom}%</span>
					<button onClick={handleZoomOut} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 18, cursor: 'pointer' }} title="Diminuir zoom"><ZoomOut /></button>
					<button onClick={handleZoomIn} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 18, cursor: 'pointer' }} title="Aumentar zoom"><ZoomIn /></button>
				</div>
				<div style={{ flex: 1, background: '#f6f3ff', padding: 0, minHeight: 0, width: '100%' }}>
					{previewUrl ? (
						<iframe
							key={previewUrl}
							src={previewUrl}
							title={fileName || 'Visualização PDF'}
							style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
						/>
					) : (
						<div style={{ padding: 40, textAlign: 'center', color: '#b71c1c' }}>Erro ao carregar PDF</div>
					)}
				</div>
			</div>
		</div>
	);
}
