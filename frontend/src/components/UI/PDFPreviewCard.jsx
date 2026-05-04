
import { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

export default function PDFPreviewCard({ fileUrl, fileName, onClose }) {
	const [numPages, setNumPages] = useState(null);
	const [pageNumber, setPageNumber] = useState(1);
	const [zoom, setZoom] = useState(1.1);
	const scrollRef = useRef();

	function onDocumentLoadSuccess({ numPages }) {
		setNumPages(numPages);
		setPageNumber(1);
	}

	const handlePrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
	const handleNextPage = () => setPageNumber((p) => Math.min(numPages || 1, p + 1));
	const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
	const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
	const handleScrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

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
					maxWidth: '96vw',
					maxHeight: '92vh',
					position: 'relative',
					padding: 0,
					display: 'flex',
					flexDirection: 'column',
				}}
				onClick={e => e.stopPropagation()}
			>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #ece3ff', background: '#f8f6ff', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
					<span style={{ fontWeight: 700, color: '#4b3b9a', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{fileName || 'Visualização PDF'}</span>
					<button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 22, cursor: 'pointer', borderRadius: 6, padding: 2 }} title="Fechar"><X size={22} /></button>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f8f6ff', borderBottom: '1px solid #ece3ff' }}>
					<button onClick={handlePrevPage} disabled={pageNumber <= 1} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 18, cursor: 'pointer', opacity: pageNumber <= 1 ? 0.4 : 1 }} title="Página anterior"><ChevronLeft /></button>
					<span style={{ fontSize: 13, color: '#4b3b9a', fontWeight: 600 }}>{pageNumber} / {numPages || '?'}</span>
					<button onClick={handleNextPage} disabled={pageNumber >= numPages} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 18, cursor: 'pointer', opacity: pageNumber >= numPages ? 0.4 : 1 }} title="Próxima página"><ChevronRight /></button>
					<span style={{ marginLeft: 18, marginRight: 2, color: '#4b3b9a', fontSize: 13 }}>{Math.round(zoom * 100)}%</span>
					<button onClick={handleZoomOut} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 18, cursor: 'pointer' }} title="Diminuir zoom"><ZoomOut /></button>
					<button onClick={handleZoomIn} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 18, cursor: 'pointer' }} title="Aumentar zoom"><ZoomIn /></button>
					<button onClick={handleScrollToTop} style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 15, cursor: 'pointer', marginLeft: 10 }} title="Topo">↑</button>
				</div>
				<div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, background: '#f6f3ff', padding: 0, minHeight: 0, maxHeight: 'calc(92vh - 90px)' }}>
					       <Document
						       file={fileUrl}
						       onLoadSuccess={onDocumentLoadSuccess}
						       loading={<div style={{ padding: 40, textAlign: 'center', color: '#4b3b9a' }}>Carregando PDF...</div>}
						       error={<div style={{ padding: 40, textAlign: 'center', color: '#b71c1c' }}>Erro ao carregar PDF</div>}
					       >
						       <Page
							       pageNumber={pageNumber}
							       width={Math.min(900, window.innerWidth * 0.85) * zoom}
							       renderTextLayer={true}
							       renderAnnotationLayer={true}
							loading={<div style={{ padding: 40, textAlign: 'center', color: '#4b3b9a' }}>Carregando página...</div>}
						/>
					</Document>
				</div>
			</div>
		</div>
	);
}
