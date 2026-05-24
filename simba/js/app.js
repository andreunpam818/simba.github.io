// State global aplikasi
let signatures = {
    sig1: null, sig2: null, sig3: null, sig4: null, sig5: null
};
let customLogo = null;
let photos = [null, null, null];
let activeSignatureKey = '';
let isDrawing = false;
let sigCanvas, sigCtx;
let signatureLayout = 'inline'; // Default layout rapat dengan tabel
let docType = 'BAMB'; // Default Jenis Dokumen: BAMB
let cachedDocuments = []; // DEKLARASI GLOBAL SANGAT PENTING

// Fungsi Pengaman Lucide Icon (Mencegah crash jika offline/gagal CDN)
function safeCreateIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        try {
            lucide.createIcons();
        } catch (e) {
            console.warn("Gagal merender beberapa ikon: ", e);
        }
    } else {
        console.warn("Pustaka Lucide Icons tidak terdeteksi (mungkin Anda sedang offline).");
    }
}

// Simulasi Dokumen Offline / Fallback
const mockDocs = [
  {
    nomor_ba: "01/TTCBSD/BAMB/V/2026",
    jenis_ba: "BAMB",
    pekerjaan: "CP2-SDN JUNIPER (Change Configuration)",
    lokasi: "TTC BSD",
    lantai: "Lantai 1",
    tanggal: "Senin, 18 Mei 2026",
    pukul: "10.00 WIB",
    no_kontrak: "4200053003",
    nama_project: "Change Configuration-CP2 SDN Juniper MTM Phase 2",
    p1_nama: "Ade Yulianto",
    p1_dept: "Transport Deployment",
    p1_hp: "0811100377",
    p2_perusahaan: "PT. Media Telekomunikasi Mandiri",
    p2_nama: "Adril Hamnur",
    p2_jabatan: "Engineer",
    p2_hp: "082159902141",
    daftar_barang: JSON.stringify([
      { no: 1, jenis: "Wiremanagement Cable", jumlah: "2", satuan: "Unit", keterangan: "Di pasang di Lantai 8 BF11" }
    ]),
    ttd1_nama: "Adril Hamnur",
    ttd2_nama: "Ade Yulianto",
    ttd3_nama: "Septian",
    ttd4_nama: "Sahlan / Prido",
    ttd5_nama: "Diki Chrismanto",
    sig1: "", sig2: "", sig3: "", sig4: "", sig5: "",
    foto1: "", foto2: "", foto3: ""
  }
];

// Pemetaan Bulan ke Angka Romawi
function getRomawi(bulan) {
    const romawi = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return romawi[bulan];
}

// Fungsi Mengubah Jenis Dokumen
function setDocType(type) {
    docType = type;
    const btnBamb = document.getElementById('btn-type-bamb');
    const btnBakb = document.getElementById('btn-type-bakb');
    
    if (type === 'BAMB') {
        if (btnBamb) btnBamb.className = "py-2.5 text-center rounded-lg bg-red-600 text-white shadow-sm flex items-center justify-center transition-all duration-150";
        if (btnBakb) btnBakb.className = "py-2.5 text-center rounded-lg text-slate-600 hover:text-slate-800 flex items-center justify-center transition-all duration-150";
        const label = document.getElementById('in-sig1-label');
        if (label) label.innerText = "1. Pembawa Barang Mitra";
    } else {
        if (btnBamb) btnBamb.className = "py-2.5 text-center rounded-lg text-slate-600 hover:text-slate-800 flex items-center justify-center transition-all duration-150";
        if (btnBakb) btnBakb.className = "py-2.5 text-center rounded-lg bg-red-600 text-white shadow-sm flex items-center justify-center transition-all duration-150";
        const label = document.getElementById('in-sig1-label');
        if (label) label.innerText = "1. Penerima Barang Mitra";
    }
    
    initNomorBA();
    showToast(`Jenis Dokumen diubah ke Berita Acara ${type === 'BAMB' ? 'Masuk' : 'Keluar'} Barang`, 'success');
}

// Tetapkan waktu online automatik hari ini
function initAutoDateTime() {
    const date = new Date();
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    const dayName = days[date.getDay()];
    const dateStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    const inputTgl = document.getElementById('in-tanggal');
    const inputPkl = document.getElementById('in-pukul');
    if (inputTgl) inputTgl.value = `${dayName}, ${dateStr}`;
    if (inputPkl) inputPkl.value = `${hours}.${minutes} WIB`;
}

// Generate Nomor BA berturut otomatis
function initNomorBA() {
    const counter = localStorage.getItem('simba_counter_val') || "01";
    const date = new Date();
    const bulanRomawi = getRomawi(date.getMonth());
    const tahun = date.getFullYear();
    
    const nomorFormatted = `${counter}/TTCBSD/${docType}/${bulanRomawi}/${tahun}`;
    const inputNomor = document.getElementById('in-nomor-ba');
    if (inputNomor) inputNomor.value = nomorFormatted;
    
    updatePreview();
}

// Tingkatkan urutan pembilang no BA
function incrementBA() {
    let current = parseInt(localStorage.getItem('simba_counter_val') || "1");
    current += 1;
    const padded = current < 10 ? '0' + current : current;
    localStorage.setItem('simba_counter_val', padded);
    initNomorBA();
    showToast("Nomor BA berhasil di-increment!", "success");
}

// Tukar Tab Borang
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-red-600', 'shadow-sm', 'text-emerald-700');
        btn.classList.add('text-slate-600', 'hover:text-slate-800');
    });

    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.add('active');
    
    const activeBtn = document.getElementById(`btn-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'hover:text-slate-800');
        if (tabId === 'tab-appsheet') {
            activeBtn.classList.add('bg-white', 'text-emerald-700', 'shadow-sm');
        } else if (tabId === 'tab-cari') {
            activeBtn.classList.add('bg-white', 'text-red-600', 'shadow-sm');
            if (cachedDocuments.length === 0) {
                fetchDocumentsFromSheet(true); // silent load awal
            }
        } else {
            activeBtn.classList.add('bg-white', 'text-red-600', 'shadow-sm');
        }
    }
}

// Tampilkan Notifikasi Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    
    if (!toast || !toastMsg) return;
    
    toastMsg.innerText = message;
    if (type === 'success') {
        toastIcon.innerHTML = `<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (type === 'info') {
        toastIcon.innerHTML = `<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else {
        toastIcon.innerHTML = `<svg class="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// Fungsi Kompresi Gambar
function compressAndLoadImage(file, callback, maxWidth = 800, maxHeight = 800) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(dataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Tambah baris input barang baru
let barangRowCounter = 1;
function addBarangRow() {
    barangRowCounter++;
    const container = document.getElementById('barang-inputs-container');
    if (!container) return;
    
    const rowHTML = `
        <div class="barang-row bg-slate-50 p-3 rounded-lg border border-slate-200 relative" data-row-id="${barangRowCounter}">
            <div class="absolute top-2 right-2 text-slate-400 font-bold text-xs">#${barangRowCounter}</div>
            <button onclick="removeBarangRow(${barangRowCounter})" class="absolute top-2 right-8 text-rose-500 hover:text-rose-700 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
            <div class="space-y-2 mt-1">
                <div>
                    <label class="block text-[10px] font-semibold uppercase text-slate-500">Jenis Barang</label>
                    <input type="text" oninput="updatePreview()" class="row-jenis-barang w-full text-xs px-2 py-1.5 border rounded">
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-[10px] font-semibold uppercase text-slate-500">Jumlah</label>
                        <input type="number" oninput="updatePreview()" class="row-jumlah w-full text-xs px-2 py-1.5 border rounded">
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold uppercase text-slate-500">Satuan</label>
                        <input type="text" value="Unit" oninput="updatePreview()" class="row-satuan w-full text-xs px-2 py-1.5 border rounded">
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-semibold uppercase text-slate-500">Keterangan</label>
                    <input type="text" oninput="updatePreview()" class="row-keterangan w-full text-xs px-2 py-1.5 border rounded">
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
    safeCreateIcons();
    updatePreview();
}

function removeBarangRow(rowId) {
    const row = document.querySelector(`.barang-row[data-row-id="${rowId}"]`);
    if (row) {
        row.remove();
        updatePreview();
    }
}

// Kontrol Modal Tanda Tangan
function openSignatureModal(key, title) {
    activeSignatureKey = key;
    const modalTitle = document.getElementById('modal-title');
    const modal = document.getElementById('signature-modal');
    
    if (modalTitle) modalTitle.innerText = title;
    if (modal) modal.classList.remove('hidden');
    
    if (sigCanvas) {
        const rect = sigCanvas.parentElement.getBoundingClientRect();
        sigCanvas.width = rect.width;
        sigCanvas.height = 192;
        
        clearSignatureCanvas();
        if (signatures[key]) {
            const img = new Image();
            img.onload = () => sigCtx.drawImage(img, 0, 0);
            img.src = signatures[key];
        }
    }
}

function closeSignatureModal() {
    const modal = document.getElementById('signature-modal');
    if (modal) modal.classList.add('hidden');
}

// Mengatur posisi layout tanda tangan
function setSigLayout(layout) {
    signatureLayout = layout;
    const btnInline = document.getElementById('btn-layout-inline');
    const btnBottom = document.getElementById('btn-layout-bottom');
    const sigContainer = document.getElementById('sig-container-block');

    if (layout === 'inline') {
        if (btnInline) btnInline.className = "py-1.5 px-3 rounded-lg text-xs font-bold bg-red-600 text-white shadow-sm transition";
        if (btnBottom) btnBottom.className = "py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition";
        if (sigContainer) {
            sigContainer.classList.remove('mt-auto');
            sigContainer.classList.add('mt-4');
        }
    } else {
        if (btnInline) btnInline.className = "py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition";
        if (btnBottom) btnBottom.className = "py-1.5 px-3 rounded-lg text-xs font-bold bg-red-600 text-white shadow-sm transition";
        if (sigContainer) {
            sigContainer.classList.remove('mt-4');
            sigContainer.classList.add('mt-auto');
        }
    }
    showToast(`Posisi tanda tangan: ${layout === 'inline' ? 'Rapat dengan Tabel' : 'Di Bawah Halaman'}`);
}

function clearSignatureCanvas() {
    if (sigCtx && sigCanvas) {
        sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    }
}

function saveSignatureCanvas() {
    if (!sigCanvas) return;
    const blank = document.createElement('canvas');
    blank.width = sigCanvas.width;
    blank.height = sigCanvas.height;
    if (sigCanvas.toDataURL() === blank.toDataURL()) {
        signatures[activeSignatureKey] = null;
    } else {
        signatures[activeSignatureKey] = sigCanvas.toDataURL('image/png');
    }
    updatePreview();
    closeSignatureModal();
    showToast('Tanda tangan berhasil diterapkan!');
}

// Muat Naik Logo Kustom dengan Kompresi Otomatis
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast('Memproses logo...', 'info');
    compressAndLoadImage(file, function(compressedUrl) {
        customLogo = compressedUrl;
        updatePreview();
        showToast('Logo kustom berhasil dimuat.');
    }, 500, 500);
}

function removeLogo() {
    customLogo = null;
    const uploadInput = document.getElementById('logo-upload');
    if (uploadInput) uploadInput.value = '';
    updatePreview();
    showToast('Kembali ke logo default.', 'info');
}

// Muat naik fail foto barang
function handleFotoUpload(event, index) {
    const file = event.target.files[0];
    if (!file) return;

    showToast(`Memproses foto ${index+1}...`, 'info');
    compressAndLoadImage(file, function(compressedUrl) {
        photos[index] = compressedUrl;
        const prevImg = document.getElementById(`slot-preview-${index}`);
        const placeholder = document.getElementById(`slot-placeholder-${index}`);
        const removeBtn = document.getElementById(`slot-remove-${index}`);
        
        if (prevImg) {
            prevImg.src = compressedUrl;
            prevImg.classList.remove('hidden');
        }
        if (placeholder) placeholder.classList.add('hidden');
        if (removeBtn) removeBtn.classList.remove('hidden');
        
        updatePreview();
        showToast(`Foto ${index+1} berhasil ditambahkan!`);
    }, 800, 800);
}

function removeFoto(index) {
    photos[index] = null;
    const uploadInput = document.getElementById(`foto-upload-${index}`);
    const prevImg = document.getElementById(`slot-preview-${index}`);
    const placeholder = document.getElementById(`slot-placeholder-${index}`);
    const removeBtn = document.getElementById(`slot-remove-${index}`);
    
    if (uploadInput) uploadInput.value = '';
    if (prevImg) prevImg.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (removeBtn) removeBtn.classList.add('hidden');
    
    updatePreview();
    showToast(`Foto ${index+1} berhasil dihapus.`, 'info');
}

// Render Lembaran Preview A4
function updatePreview() {
    const inNomor = document.getElementById('in-nomor-ba');
    const nomorBA = inNomor ? inNomor.value : '';
    
    const titleBa = document.getElementById('p-title-ba');
    const statementAct = document.getElementById('p-statement-action');
    const sig1Label = document.getElementById('p-sig1-label');
    
    if (docType === 'BAMB') {
        if (titleBa) titleBa.innerText = "BERITA ACARA MASUK BARANG";
        if (statementAct) statementAct.innerText = "MASUK BARANG";
        if (sig1Label) sig1Label.innerHTML = "Pembawa Barang<br>Mitra";
    } else {
        if (titleBa) titleBa.innerText = "BERITA ACARA KELUAR BARANG";
        if (statementAct) statementAct.innerText = "KELUAR BARANG";
        if (sig1Label) sig1Label.innerHTML = "Penerima Barang<br>Mitra";
    }

    const mapIds = {
        'p-nomor-ba': 'in-nomor-ba',
        'p-pekerjaan': 'in-pekerjaan',
        'p-lokasi': 'in-lokasi',
        'p-lantai': 'in-lantai',
        'p-tanggal': 'in-tanggal',
        'p-pukul': 'in-pukul',
        'p-no-kontrak': 'in-no-kontrak',
        'p-nama-project': 'in-nama-project',
        'p-p1-nama': 'in-p1-nama',
        'p-p1-dept': 'in-p1-dept',
        'p-p1-hp': 'in-p1-hp',
        'p-p2-nama': 'in-p2-nama',
        'p-p2-jabatan': 'in-p2-jabatan',
        'p-p2-hp': 'in-p2-hp',
        'p-p2-perusahaan': 'in-p2-perusahaan',
        'p-sig1-nama': 'in-ttd1-nama',
        'p-sig2-nama': 'in-ttd2-nama',
        'p-sig3-nama': 'in-ttd3-nama',
        'p-sig4-nama': 'in-ttd4-nama',
        'p-sig5-nama': 'in-ttd5-nama'
    };

    Object.keys(mapIds).forEach(prevId => {
        const pEl = document.getElementById(prevId);
        const iEl = document.getElementById(mapIds[prevId]);
        if (pEl && iEl) {
            pEl.innerText = iEl.value || '...';
        }
    });

    // Generasikan QR Code
    const qrImg = document.getElementById('prev-qrcode-img');
    const qrBaNum = document.getElementById('p-qrcode-ba-num');
    if (qrImg) {
        try {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(nomorBA)}`;
            qrImg.src = qrUrl;
        } catch (error) {
            console.error("Gagal merender QR Code:", error);
        }
    }
    if (qrBaNum) qrBaNum.innerText = nomorBA;

    // Logik Tukar Logo
    const defaultLogo = document.getElementById('default-logo-container');
    const customLogoDiv = document.getElementById('custom-logo-container');
    const customLogoImg = document.getElementById('p-custom-logo');
    const removeLogoBtn = document.getElementById('btn-remove-logo');

    if (customLogo) {
        if (defaultLogo) defaultLogo.classList.add('hidden');
        if (customLogoDiv) customLogoDiv.classList.remove('hidden');
        if (customLogoImg) customLogoImg.src = customLogo;
        if (removeLogoBtn) removeLogoBtn.classList.remove('hidden');
    } else {
        if (defaultLogo) defaultLogo.classList.remove('hidden');
        if (customLogoDiv) customLogoDiv.classList.add('hidden');
        if (removeLogoBtn) removeLogoBtn.classList.add('hidden');
    }

    // Tanda Tangan lakaran di kanvas pratinjau
    Object.keys(signatures).forEach(key => {
        const imgEl = document.getElementById(`img-${key}`);
        const lineEl = document.getElementById(`line-${key}`);
        const statusEl = document.getElementById(`preview-${key}-status`);
        
        if (signatures[key]) {
            if (imgEl) {
                imgEl.src = signatures[key];
                imgEl.classList.remove('hidden');
            }
            if (lineEl) lineEl.classList.add('hidden');
            if (statusEl) statusEl.innerHTML = `<span class="text-emerald-600 font-bold flex items-center justify-center"><i data-lucide="check" class="w-3 h-3 mr-1"></i> Tersimpan</span>`;
        } else {
            if (imgEl) imgEl.classList.add('hidden');
            if (lineEl) lineEl.classList.remove('hidden');
            if (statusEl) statusEl.innerHTML = "Belum Ada Tanda Tangan";
        }
    });

    // Sinkronisasi baris item barang ke tabel preview
    const tableBody = document.getElementById('preview-table-body');
    if (tableBody) {
        tableBody.innerHTML = '';
        const rows = document.querySelectorAll('.barang-row');
        
        rows.forEach((row, i) => {
            const inJenis = row.querySelector('.row-jenis-barang');
            const inJumlah = row.querySelector('.row-jumlah');
            const inSatuan = row.querySelector('.row-satuan');
            const inKet = row.querySelector('.row-keterangan');

            const jenis = inJenis ? inJenis.value || '-' : '-';
            const jumlah = inJumlah ? inJumlah.value || '0' : '0';
            const satuan = inSatuan ? inSatuan.value || 'Unit' : 'Unit';
            const keterangan = inKet ? inKet.value || '-' : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="border border-slate-800 py-1 px-2">${i + 1}</td>
                <td class="border border-slate-800 py-1 px-2 text-left">${jenis}</td>
                <td class="border border-slate-800 py-1 px-2">${jumlah}</td>
                <td class="border border-slate-800 py-1 px-2">${satuan}</td>
                <td class="border border-slate-800 py-1 px-2 text-left">${keterangan}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Grid susunan lampiran gambar
    const photoGrid = document.getElementById('preview-photos-grid');
    const placeholder = document.getElementById('p-barang-foto-placeholder');
    const activePhotos = photos.filter(p => p !== null);

    if (photoGrid && placeholder) {
        if (activePhotos.length === 0) {
            photoGrid.classList.add('hidden');
            placeholder.classList.remove('hidden');
        } else {
            photoGrid.classList.remove('hidden');
            placeholder.classList.add('hidden');
            photoGrid.innerHTML = '';
            
            if (activePhotos.length === 1) {
                photoGrid.className = "grid grid-cols-1 gap-4 w-full h-full items-center justify-center";
                activePhotos.forEach(src => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.className = "w-full h-full max-h-[150mm] object-contain border border-slate-300 rounded mx-auto shadow-sm bg-white";
                    photoGrid.appendChild(img);
                });
            } else if (activePhotos.length === 2) {
                photoGrid.className = "grid grid-cols-2 gap-4 w-full h-full items-center justify-center";
                activePhotos.forEach(src => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.className = "w-full h-full max-h-[140mm] object-contain border border-slate-300 rounded mx-auto shadow-sm bg-white";
                    photoGrid.appendChild(img);
                });
            } else if (activePhotos.length === 3) {
                photoGrid.className = "grid grid-cols-2 grid-rows-2 gap-4 w-full h-full items-center justify-center";
                activePhotos.forEach((src, idx) => {
                    const img = document.createElement('img');
                    img.src = src;
                    if (idx === 0) {
                        img.className = "col-span-2 w-full h-full max-h-[80mm] object-contain border border-slate-300 rounded mx-auto shadow-sm bg-white";
                    } else {
                        img.className = "w-full h-full max-h-[65mm] object-contain border border-slate-300 rounded mx-auto shadow-sm bg-white";
                    }
                    photoGrid.appendChild(img);
                });
            }
        }
    }
    safeCreateIcons();
}

// Muat Turun Dokumen Format PDF
function downloadPDF() {
    const inNomor = document.getElementById('in-nomor-ba');
    const nomorBA = inNomor ? inNomor.value : 'BA';
    
    if (typeof html2pdf === 'undefined') {
        showToast("Pustaka PDF (html2pdf) gagal dimuat. Cek koneksi internet.", "error");
        return;
    }
    
    showToast("Memproses cetakan PDF...", "info");
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    element.classList.add('is-pdf');
    
    const prefixFilename = docType === 'BAMB' ? 'BA_Masuk_Barang' : 'BA_Keluar_Barang';
    const sanitizedFilename = `${prefixFilename}_${nomorBA.replace(/[\/\\?%*:|"<>\s]/g, '_')}.pdf`;

    const opt = {
        margin:       0,
        filename:     sanitizedFilename,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { 
            scale: 2.0,            
            useCORS: true,         
            letterRendering: true, 
            logging: false,
            backgroundColor: '#ffffff',
            scrollY: 0
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
    };

    setTimeout(() => {
        html2pdf().from(element).set(opt).save().then(() => {
            showToast("PDF Berhasil Diunduh!", "success");
            element.classList.remove('is-pdf');
        }).catch(err => {
            console.error(err);
            showToast("Gagal merender PDF.", "error");
            element.classList.remove('is-pdf');
        });
    }, 150);
}

// Helper fetch otomatis dengan Exponential Backoff
async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
    try {
        const response = await fetch(url, options);
        if (!response.ok && response.status !== 0) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return response;
    } catch (error) {
        if (retries <= 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
}

// Integrasi Sinkronisasi Otomatis ke Google Sheets
async function saveToAppSheet() {
    const webAppUrl = "https://script.google.com/macros/s/AKfycbwOfmOGdiouHZ-DfM2wDCT2cLnJLDMqGX_Dyo04FYA3-JkyYuTK58CMxfXaQrQGnxlhTg/exec";
    showToast("Menghubungkan ke Google Sheets...", "info");
    
    const syncIndicator = document.getElementById('cloud-sync-indicator');
    const syncStatus = document.getElementById('cloud-sync-status');
    const docIdInput = document.getElementById('appsheet-doc-id');
    
    if (syncIndicator) syncIndicator.className = "w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse";
    if (syncStatus) syncStatus.innerText = "Mengirim...";

    const listBarang = [];
    const rows = document.querySelectorAll('.barang-row');
    rows.forEach((row, i) => {
        const inJenis = row.querySelector('.row-jenis-barang');
        const inJumlah = row.querySelector('.row-jumlah');
        const inSatuan = row.querySelector('.row-satuan');
        const inKet = row.querySelector('.row-keterangan');

        listBarang.push({
            no: i + 1,
            jenis: inJenis ? inJenis.value || '-' : '-',
            jumlah: inJumlah ? inJumlah.value || '0' : '0',
            satuan: inSatuan ? inSatuan.value || 'Unit' : 'Unit',
            keterangan: inKet ? inKet.value || '-' : '-'
        });
    });

    const inNomor = document.getElementById('in-nomor-ba');
    const nomorBA = inNomor ? inNomor.value : 'BA';

    const payload = {
        nomor_ba: nomorBA,
        jenis_ba: docType,
        pekerjaan: document.getElementById('in-pekerjaan') ? document.getElementById('in-pekerjaan').value : '',
        lokasi: document.getElementById('in-lokasi') ? document.getElementById('in-lokasi').value : '',
        lantai: document.getElementById('in-lantai') ? document.getElementById('in-lantai').value : '',
        tanggal: document.getElementById('in-tanggal') ? document.getElementById('in-tanggal').value : '',
        pukul: document.getElementById('in-pukul') ? document.getElementById('in-pukul').value : '',
        no_kontrak: document.getElementById('in-no-kontrak') ? document.getElementById('in-no-kontrak').value : '',
        nama_project: document.getElementById('in-nama-project') ? document.getElementById('in-nama-project').value : '',
        p1_nama: document.getElementById('in-p1-nama') ? document.getElementById('in-p1-nama').value : '',
        p1_dept: document.getElementById('in-p1-dept') ? document.getElementById('in-p1-dept').value : '',
        p1_hp: document.getElementById('in-p1-hp') ? document.getElementById('in-p1-hp').value : '',
        p2_perusahaan: document.getElementById('in-p2-perusahaan') ? document.getElementById('in-p2-perusahaan').value : '',
        p2_nama: document.getElementById('in-p2-nama') ? document.getElementById('in-p2-nama').value : '',
        p2_jabatan: document.getElementById('in-p2-jabatan') ? document.getElementById('in-p2-jabatan').value : '',
        p2_hp: document.getElementById('in-p2-hp') ? document.getElementById('in-p2-hp').value : '',
        daftar_barang: JSON.stringify(listBarang),
        ttd1_nama: document.getElementById('in-ttd1-nama') ? document.getElementById('in-ttd1-nama').value : '',
        ttd2_nama: document.getElementById('in-ttd2-nama') ? document.getElementById('in-ttd2-nama').value : '',
        ttd3_nama: document.getElementById('in-ttd3-nama') ? document.getElementById('in-ttd3-nama').value : '',
        ttd4_nama: document.getElementById('in-ttd4-nama') ? document.getElementById('in-ttd4-nama').value : '',
        ttd5_nama: document.getElementById('in-ttd5-nama') ? document.getElementById('in-ttd5-nama').value : '',
        sig1: signatures.sig1 || "",
        sig2: signatures.sig2 || "",
        sig3: signatures.sig3 || "",
        sig4: signatures.sig4 || "",
        sig5: signatures.sig5 || "",
        foto1: photos[0] || "",
        foto2: photos[1] || "",
        foto3: photos[2] || "",
        timestamp: new Date().toISOString()
    };

    try {
        await fetchWithRetry(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        if (syncIndicator) syncIndicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
        if (syncStatus) syncStatus.innerText = "Tersinkronisasi!";
        if (docIdInput) docIdInput.value = nomorBA;
        showToast(`Sukses! Berita Acara (${docType}) berhasil disimpan ke Google Sheet.`, "success");
    } catch (error) {
        console.error("Gagal menyinkronkan ke Google Sheets:", error);
        if (syncIndicator) syncIndicator.className = "w-2.5 h-2.5 rounded-full bg-rose-500";
        if (syncStatus) syncStatus.innerText = "Gagal Sinkronisasi";
        showToast("Gagal menyimpan ke Google Sheet. Silakan coba beberapa saat lagi.", "error");
    }
}

// Reset Formulir
function triggerResetConfirm() {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) confirmModal.classList.add('hidden');
}

function executeResetAll() {
    closeConfirmModal();
    localStorage.removeItem('simba_counter_val');
    
    signatures = { sig1: null, sig2: null, sig3: null, sig4: null, sig5: null };
    customLogo = null;
    photos = [null, null, null];
    
    const logoUp = document.getElementById('logo-upload');
    if (logoUp) logoUp.value = '';
    
    for (let i = 0; i < 3; i++) {
        const fotoUp = document.getElementById(`foto-upload-${i}`);
        const slotPrev = document.getElementById(`slot-preview-${i}`);
        const slotPlace = document.getElementById(`slot-placeholder-${i}`);
        const slotRem = document.getElementById(`slot-remove-${i}`);
        
        if (fotoUp) fotoUp.value = '';
        if (slotPrev) slotPrev.classList.add('hidden');
        if (slotPlace) slotPlace.classList.remove('hidden');
        if (slotRem) slotRem.classList.add('hidden');
    }

    const cloudStatus = document.getElementById('cloud-sync-status');
    const cloudIndicator = document.getElementById('cloud-sync-indicator');
    const appsheetDocId = document.getElementById('appsheet-doc-id');
    
    if (cloudStatus) cloudStatus.innerText = "Belum disinkronkan";
    if (cloudIndicator) cloudIndicator.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
    if (appsheetDocId) appsheetDocId.value = "BELUM DISIMPAN";

    setSigLayout('inline');
    setDocType('BAMB');

    initNomorBA();
    initAutoDateTime();
    updatePreview();
    showToast("Formulir berhasil direset.", "info");
}

// MEMPERBAIKI FUNGSI FETCH / BACA DATA (DOGET) DARI GOOGLE SHEET
async function fetchDocumentsFromSheet(silent = false) {
    const webAppUrl = "https://script.google.com/macros/s/AKfycbwOfmOGdiouHZ-DfM2wDCT2cLnJLDMqGX_Dyo04FYA3-JkyYuTK58CMxfXaQrQGnxlhTg/exec";
    const url = `${webAppUrl}?action=read`;
    
    const statusEl = document.getElementById('search-status');
    const resultsList = document.getElementById('search-results-list');
    
    if (!silent) {
        if (statusEl) statusEl.innerHTML = `<span class="text-blue-600 font-semibold flex items-center"><i data-lucide="loader" class="w-4 h-4 mr-2 animate-spin flex-shrink-0"></i> Menghubungkan ke Google Sheet...</span>`;
        if (resultsList) {
            resultsList.innerHTML = `
                <div class="text-center p-12 text-slate-500 space-y-3">
                    <div class="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-red-600 rounded-full" role="status" aria-label="loading"></div>
                    <p class="text-xs font-semibold">Sedang mengunduh basis data dari Google Sheets...</p>
                </div>
            `;
        }
        safeCreateIcons();
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 Detik Timeout
        
        const response = await fetch(url, { 
            method: 'GET',
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error("Gagal terhubung dengan server Google Apps Script.");
        }
        
        const data = await response.json();
        let docsArray = [];
        
        if (data && data.status === "success" && Array.isArray(data.data)) {
            docsArray = data.data;
        } else if (Array.isArray(data)) {
            docsArray = data;
        } else if (data && Array.isArray(data.records)) {
            docsArray = data.records;
        } else if (data && typeof data === 'object') {
            if (data.data && Array.isArray(data.data)) {
                docsArray = data.data;
            } else {
                docsArray = Object.values(data).find(val => Array.isArray(val)) || [];
            }
        }

        docsArray = docsArray.filter(doc => doc && (doc.nomor_ba || doc["Nomor BA"]));

        if (docsArray.length > 0) {
            cachedDocuments = docsArray;
            if (statusEl) statusEl.innerHTML = `<span class="text-emerald-600 font-semibold flex items-center"><i data-lucide="check-circle" class="w-4 h-4 mr-2 flex-shrink-0"></i> Sukses memuat ${docsArray.length} dokumen dari Cloud.</span>`;
            performSearch();
        } else {
            if (statusEl) statusEl.innerHTML = `<span class="text-amber-600 font-semibold flex items-center"><i data-lucide="alert-circle" class="w-4 h-4 mr-2 flex-shrink-0"></i> Koneksi sukses, namun database kosong.</span>`;
            setupDemoSearch(true);
        }
    } catch (error) {
        console.warn("Koneksi gagal/CORS. Beralih ke demonstrasi simulasi offline:", error);
        if (!silent) {
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-slate-700 space-y-1.5 text-left">
                        <p class="font-bold text-red-600">Koneksi Real-time Mengalami Kendala (CORS / Belum Di-deploy)</p>
                        <p class="text-[10px]">Pastikan Apps Script Anda di-deploy ulang sebagai <b>Web App</b> baru dengan Akses: <b>Anyone</b> dan memiliki fungsi <code>doGet()</code> terupdate.</p>
                        <div class="flex gap-2 pt-1">
                            <button onclick="setupDemoSearch(false)" class="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition flex items-center">
                                <i data-lucide="play" class="w-3 h-3 mr-1"></i> Gunakan Simulasi Data
                            </button>
                            <button onclick="fetchDocumentsFromSheet()" class="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[10px] transition">
                                Coba Lagi
                            </button>
                        </div>
                    </div>
                `;
            }
            cachedDocuments = [...mockDocs];
            performSearch();
        }
    }
    safeCreateIcons();
}

// Memuat database demo offline
function setupDemoSearch(isCloudEmpty = false) {
    cachedDocuments = [...mockDocs];
    const statusEl = document.getElementById('search-status');
    
    if (statusEl) {
        if (isCloudEmpty) {
            statusEl.innerHTML = `<span class="text-indigo-600 font-semibold flex items-center"><i data-lucide="info" class="w-4 h-4 mr-2 flex-shrink-0"></i> Menggunakan Data Riwayat Simulasi (Sheet Kosong)</span>`;
        } else {
            statusEl.innerHTML = `<span class="text-indigo-600 font-semibold flex items-center"><i data-lucide="info" class="w-4 h-4 mr-2 flex-shrink-0"></i> Mode Simulasi Berhasil Diaktifkan!</span>`;
        }
    }
    performSearch();
}

// Melakukan filter pencarian dinamis (On-input)
function performSearch() {
    const queryEl = document.getElementById('search-query');
    const query = queryEl ? queryEl.value.toLowerCase().trim() : '';
    
    if (query.length > 0 && cachedDocuments.length === 0) {
        fetchDocumentsFromSheet(true);
        return;
    }

    const filtered = cachedDocuments.filter(doc => {
        const nomor = (doc.nomor_ba || doc["Nomor BA"] || '').toLowerCase();
        const pekerjaan = (doc.pekerjaan || doc["Pekerjaan"] || '').toLowerCase();
        const namaProject = (doc.nama_project || doc["Nama Project"] || '').toLowerCase();
        const p1_nama = (doc.p1_nama || doc["P1 Nama"] || '').toLowerCase();
        const p2_nama = (doc.p2_nama || doc["P2 Nama"] || '').toLowerCase();
        const p2_perusahaan = (doc.p2_perusahaan || doc["P2 Perusahaan"] || '').toLowerCase();
        const ttd1 = (doc.ttd1_nama || doc["TTD1 Nama"] || '').toLowerCase();
        
        return nomor.includes(query) || 
               pekerjaan.includes(query) || 
               namaProject.includes(query) || 
               p1_nama.includes(query) || 
               p2_nama.includes(query) || 
               ttd1.includes(query) ||
               p2_perusahaan.includes(query);
    });
    renderSearchResults(filtered);
}

// Render Card Hasil Pencarian ke HTML
function renderSearchResults(docs) {
    const list = document.getElementById('search-results-list');
    const queryEl = document.getElementById('search-query');
    const query = queryEl ? queryEl.value.trim() : '';
    
    if (!list) return;
    list.innerHTML = '';
    
    if (docs.length === 0) {
        list.innerHTML = `
            <div class="text-center p-8 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-600">
                    <i data-lucide="alert-circle" class="w-6 h-6"></i>
                </div>
                <div>
                    <h5 class="font-bold text-slate-800 text-sm">Dokumen tidak ditemukan</h5>
                    <p class="text-xs text-slate-500 mt-1">Tidak ada data Berita Acara yang cocok dengan kata kunci "${query}" di Google Sheets.</p>
                </div>
                <button onclick="fetchDocumentsFromSheet()" class="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-1.5 rounded-lg shadow-sm inline-flex items-center transition">
                    <i data-lucide="refresh-cw" class="w-3 h-3 mr-1.5"></i> Coba Sinkronisasi Ulang
                </button>
            </div>
        `;
        safeCreateIcons();
        return;
    }

    docs.forEach(doc => {
        const card = document.createElement('div');
        card.className = "bg-slate-50 border border-slate-200 p-3.5 rounded-xl hover:border-red-400 transition hover:shadow-sm space-y-2.5 text-left animate-fadeIn";
        
        const rawNoBa = doc.nomor_ba || doc["Nomor BA"] || "BA/ERROR";
        const rawJenisBa = doc.jenis_ba || doc["Jenis BA"] || "BAMB";
        const badgeColor = rawJenisBa === 'BAMB' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200';
        const badgeText = rawJenisBa === 'BAMB' ? 'Masuk' : 'Keluar';

        card.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div class="space-y-0.5">
                    <span class="inline-block px-2 py-0.5 text-[9px] font-bold rounded border ${badgeColor}">${badgeText}</span>
                    <h4 class="font-bold text-slate-800 text-xs font-mono leading-tight">${rawNoBa}</h4>
                </div>
                <button onclick="loadDocumentData('${rawNoBa}')" class="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center transition shadow-sm flex-shrink-0">
                    <i data-lucide="file-symlink" class="w-3.5 h-3.5 mr-1 flex-shrink-0"></i> Muat BA
                </button>
            </div>
            <div class="text-[10.5px] text-slate-600 space-y-1 border-t pt-2">
                <div class="flex justify-between gap-4"><span class="font-semibold text-slate-500 flex-shrink-0">Pekerjaan:</span> <span class="text-right truncate font-medium text-slate-800">${doc.pekerjaan || doc["Pekerjaan"] || '-'}</span></div>
                <div class="flex justify-between gap-4"><span class="font-semibold text-slate-500 flex-shrink-0">Mitra:</span> <span class="text-right truncate font-medium text-slate-800">${doc.p2_perusahaan || doc["P2 Perusahaan"] || '-'}</span></div>
                <div class="flex justify-between gap-4"><span class="font-semibold text-slate-500 flex-shrink-0">PIC Mitra:</span> <span class="text-right font-bold text-slate-800">${doc.p2_nama || doc["P2 Nama"] || doc.ttd1_nama || doc["TTD1 Nama"] || '-'}</span></div>
                <div class="flex justify-between gap-4"><span class="font-semibold text-slate-500 flex-shrink-0">Tanggal:</span> <span class="text-right text-slate-500 text-[10px]">${doc.tanggal || doc["Hari Tanggal"] || '-'}</span></div>
            </div>
        `;
        list.appendChild(card);
    });
    safeCreateIcons();
}

// Pengisian Formulir Otomatis (Auto-fill) dari Dokumen yang Dipilih
function loadDocumentData(nomorBa) {
    const doc = cachedDocuments.find(d => (d.nomor_ba === nomorBa || d["Nomor BA"] === nomorBa));
    if (!doc) return;

    // Mapping adaptif jika kunci masih berformat spasi/kapital
    const nomor_ba = doc.nomor_ba || doc["Nomor BA"] || '';
    const jenis_ba = doc.jenis_ba || doc["Jenis BA"] || 'BAMB';
    const pekerjaan = doc.pekerjaan || doc["Pekerjaan"] || '';
    const lokasi = doc.lokasi || doc["Lokasi"] || 'TTC BSD';
    const lantai = doc.lantai || doc["Lantai"] || 'Lantai 1';
    const tanggal = doc.tanggal || doc["Hari Tanggal"] || '';
    const pukul = doc.pukul || doc["Pukul"] || '';
    const no_kontrak = doc.no_kontrak || doc["No Kontrak"] || '';
    const nama_project = doc.nama_project || doc["Nama Project"] || '';

    const p1_nama = doc.p1_nama || doc["P1 Nama"] || '';
    const p1_dept = doc.p1_dept || doc["P1 Dept"] || '';
    const p1_hp = doc.p1_hp || doc["P1 HP"] || '';
    const p2_perusahaan = doc.p2_perusahaan || doc["P2 Perusahaan"] || '';
    const p2_nama = doc.p2_nama || doc["P2 Nama"] || '';
    const p2_jabatan = doc.p2_jabatan || doc["P2 Jabatan"] || '';
    const p2_hp = doc.p2_hp || doc["P2 HP"] || '';

    const ttd1_nama = doc.ttd1_nama || doc["TTD1 Nama"] || '';
    const ttd2_nama = doc.ttd2_nama || doc["TTD2 Nama"] || '';
    const ttd3_nama = doc.ttd3_nama || doc["TTD3 Nama"] || '';
    const ttd4_nama = doc.ttd4_nama || doc["TTD4 Nama"] || '';
    const ttd5_nama = doc.ttd5_nama || doc["TTD5 Nama"] || '';

    const raw_sig1 = doc.sig1 || doc["Base64 TTD 1"] || null;
    const raw_sig2 = doc.sig2 || doc["Base64 TTD 2"] || null;
    const raw_sig3 = doc.sig3 || doc["Base64 TTD 3"] || null;
    const raw_sig4 = doc.sig4 || doc["Base64 TTD 4"] || null;
    const raw_sig5 = doc.sig5 || doc["Base64 TTD 5"] || null;

    const raw_foto1 = doc.foto1 || doc["Base64 Foto 1"] || null;
    const raw_foto2 = doc.foto2 || doc["Base64 Foto 2"] || null;
    const raw_foto3 = doc.foto3 || doc["Base64 Foto 3"] || null;

    const daftar_barang_raw = doc.daftar_barang || doc["Daftar Barang JSON"] || '[]';

    // Set jenis Berita Acara
    setDocType(jenis_ba);

    // Set isian data umum
    if (document.getElementById('in-nomor-ba')) document.getElementById('in-nomor-ba').value = nomor_ba;
    if (document.getElementById('in-pekerjaan')) document.getElementById('in-pekerjaan').value = pekerjaan;
    if (document.getElementById('in-lokasi')) document.getElementById('in-lokasi').value = lokasi;
    if (document.getElementById('in-lantai')) document.getElementById('in-lantai').value = lantai;
    if (document.getElementById('in-tanggal')) document.getElementById('in-tanggal').value = tanggal;
    if (document.getElementById('in-pukul')) document.getElementById('in-pukul').value = pukul;
    if (document.getElementById('in-no-kontrak')) document.getElementById('in-no-kontrak').value = no_kontrak;
    if (document.getElementById('in-nama-project')) document.getElementById('in-nama-project').value = nama_project;

    // Set isian pihak bersepakat
    if (document.getElementById('in-p1-nama')) document.getElementById('in-p1-nama').value = p1_nama;
    if (document.getElementById('in-p1-dept')) document.getElementById('in-p1-dept').value = p1_dept;
    if (document.getElementById('in-p1-hp')) document.getElementById('in-p1-hp').value = p1_hp;
    if (document.getElementById('in-p2-perusahaan')) document.getElementById('in-p2-perusahaan').value = p2_perusahaan;
    if (document.getElementById('in-p2-nama')) document.getElementById('in-p2-nama').value = p2_nama;
    if (document.getElementById('in-p2-jabatan')) document.getElementById('in-p2-jabatan').value = p2_jabatan;
    if (document.getElementById('in-p2-hp')) document.getElementById('in-p2-hp').value = p2_hp;

    // Set nama penandatangan
    if (document.getElementById('in-ttd1-nama')) document.getElementById('in-ttd1-nama').value = ttd1_nama;
    if (document.getElementById('in-ttd2-nama')) document.getElementById('in-ttd2-nama').value = ttd2_nama;
    if (document.getElementById('in-ttd3-nama')) document.getElementById('in-ttd3-nama').value = ttd3_nama;
    if (document.getElementById('in-ttd4-nama')) document.getElementById('in-ttd4-nama').value = ttd4_nama;
    if (document.getElementById('in-ttd5-nama')) document.getElementById('in-ttd5-nama').value = ttd5_nama;

    // Set dan bongkar dinamis baris barang
    const container = document.getElementById('barang-inputs-container');
    if (container) {
        container.innerHTML = '';
        barangRowCounter = 0;

        try {
            const listBarang = JSON.parse(daftar_barang_raw);
            if (listBarang.length > 0) {
                listBarang.forEach(item => {
                    barangRowCounter++;
                    const rowHTML = `
                        <div class="barang-row bg-slate-50 p-3 rounded-lg border border-slate-200 relative" data-row-id="${barangRowCounter}">
                            <div class="absolute top-2 right-2 text-slate-400 font-bold text-xs">#${barangRowCounter}</div>
                            ${barangRowCounter > 1 ? `
                            <button onclick="removeBarangRow(${barangRowCounter})" class="absolute top-2 right-8 text-rose-500 hover:text-rose-700 transition">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                            ` : ''}
                            <div class="space-y-2 mt-1">
                                <div>
                                    <label class="block text-[10px] font-semibold uppercase text-slate-500">Jenis Barang</label>
                                    <input type="text" value="${item.jenis || item.jenis_barang || ''}" oninput="updatePreview()" class="row-jenis-barang w-full text-xs px-2 py-1.5 border rounded">
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-[10px] font-semibold uppercase text-slate-500">Jumlah</label>
                                        <input type="number" value="${item.jumlah || '0'}" oninput="updatePreview()" class="row-jumlah w-full text-xs px-2 py-1.5 border rounded">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-semibold uppercase text-slate-500">Satuan</label>
                                        <input type="text" value="${item.satuan || 'Unit'}" oninput="updatePreview()" class="row-satuan w-full text-xs px-2 py-1.5 border rounded">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold uppercase text-slate-500">Keterangan</label>
                                    <input type="text" value="${item.keterangan || ''}" oninput="updatePreview()" class="row-keterangan w-full text-xs px-2 py-1.5 border rounded">
                                </div>
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', rowHTML);
                });
            } else {
                addBarangRow();
            }
        } catch (e) {
            console.error("Gagal mendefinisikan array barang:", e);
            addBarangRow();
        }
    }

    // Memuat tanda tangan (Base64)
    signatures.sig1 = raw_sig1;
    signatures.sig2 = raw_sig2;
    signatures.sig3 = raw_sig3;
    signatures.sig4 = raw_sig4;
    signatures.sig5 = raw_sig5;

    // Memuat foto lampiran bukti fisik
    photos[0] = raw_foto1;
    photos[1] = raw_foto2;
    photos[2] = raw_foto3;

    for (let i = 0; i < 3; i++) {
        const imgSlot = document.getElementById(`slot-preview-${i}`);
        const placeholderSlot = document.getElementById(`slot-placeholder-${i}`);
        const removeBtn = document.getElementById(`slot-remove-${i}`);
        
        if (photos[i]) {
            if (imgSlot) {
                imgSlot.src = photos[i];
                imgSlot.classList.remove('hidden');
            }
            if (placeholderSlot) placeholderSlot.classList.add('hidden');
            if (removeBtn) removeBtn.classList.remove('hidden');
        } else {
            if (imgSlot) imgSlot.classList.add('hidden');
            if (placeholderSlot) placeholderSlot.classList.remove('hidden');
            if (removeBtn) removeBtn.classList.add('hidden');
        }
    }

    // Sinkronkan status Cloud
    const cloudStatus = document.getElementById('cloud-sync-status');
    const cloudIndicator = document.getElementById('cloud-sync-indicator');
    const appsheetDocId = document.getElementById('appsheet-doc-id');
    
    if (cloudStatus) cloudStatus.innerText = "Tersinkronisasi (Dimuat)";
    if (cloudIndicator) cloudIndicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
    if (appsheetDocId) appsheetDocId.value = nomor_ba;

    // Muat Ulang Live Preview
    updatePreview();
    
    // Bawa pandangan fokus pengguna ke Tab Utama (Umum)
    switchTab('tab-umum');
    showToast(`Data BA ${nomor_ba} Sukses Dimuat!`, "success");
}

// Pengurusan Lakaran Sentuh / Tetikus pada Canvas TTD
window.addEventListener('DOMContentLoaded', () => {
    sigCanvas = document.getElementById('signature-canvas');
    if (sigCanvas) {
        sigCtx = sigCanvas.getContext('2d');

        sigCanvas.addEventListener('mousedown', startDrawing);
        sigCanvas.addEventListener('mousemove', draw);
        sigCanvas.addEventListener('mouseup', stopDrawing);
        sigCanvas.addEventListener('mouseout', stopDrawing);

        sigCanvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const rect = sigCanvas.getBoundingClientRect();
            isDrawing = true;
            sigCtx.beginPath();
            sigCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
            e.preventDefault();
        });

        sigCanvas.addEventListener('touchmove', (e) => {
            if (!isDrawing) return;
            const touch = e.touches[0];
            const rect = sigCanvas.getBoundingClientRect();
            sigCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
            sigCtx.strokeStyle = '#000000';
            sigCtx.lineWidth = 2.5;
            sigCtx.lineCap = 'round';
            sigCtx.stroke();
            e.preventDefault();
        });

        sigCanvas.addEventListener('touchend', stopDrawing);
    }

    function startDrawing(e) {
        if (!sigCanvas || !sigCtx) return;
        isDrawing = true;
        sigCtx.beginPath();
        const rect = sigCanvas.getBoundingClientRect();
        sigCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }

    function draw(e) {
        if (!isDrawing || !sigCanvas || !sigCtx) return;
        const rect = sigCanvas.getBoundingClientRect();
        sigCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        sigCtx.strokeStyle = '#000000';
        sigCtx.lineWidth = 2.5;
        sigCtx.lineCap = 'round';
        sigCtx.stroke();
    }

    function stopDrawing() {
        isDrawing = false;
    }

    // Jalankan tetapan permulaan ketika aplikasi dimuatkan
    initAutoDateTime();
    initNomorBA();
    setSigLayout('inline');
    setDocType('BAMB');
    updatePreview();
    safeCreateIcons();
});

// EKSPOR SEMUA FUNGSI PENTING KE WINDOW GLOBAL (Menjamin Event HTML onclick Berfungsi Normal di Local/Offline)
window.setDocType = setDocType;
window.incrementBA = incrementBA;
window.switchTab = switchTab;
window.addBarangRow = addBarangRow;
window.removeBarangRow = removeBarangRow;
window.openSignatureModal = openSignatureModal;
window.closeSignatureModal = closeSignatureModal;
window.setSigLayout = setSigLayout;
window.clearSignatureCanvas = clearSignatureCanvas;
window.saveSignatureCanvas = saveSignatureCanvas;
window.handleLogoUpload = handleLogoUpload;
window.removeLogo = removeLogo;
window.handleFotoUpload = handleFotoUpload;
window.removeFoto = removeFoto;
window.updatePreview = updatePreview;
window.downloadPDF = downloadPDF;
window.saveToAppSheet = saveToAppSheet;
window.triggerResetConfirm = triggerResetConfirm;
window.closeConfirmModal = closeConfirmModal;
window.executeResetAll = executeResetAll;
window.fetchDocumentsFromSheet = fetchDocumentsFromSheet;
window.setupDemoSearch = setupDemoSearch;
window.performSearch = performSearch;
window.loadDocumentData = loadDocumentData;