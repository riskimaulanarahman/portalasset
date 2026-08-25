import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HelpCircle, 
  Database, 
  Map, 
  Layers, 
  Package, 
  ClipboardList, 
  History, 
  ArrowLeftRight, 
  Users, 
  Wallet,
  CheckCircle2,
  Code,
  Factory,
  Tag
} from 'lucide-react';
import useTitle from '../hooks/useTitle';
import Modal from '../components/Modal';

const steps = [
  {
    title: 'Tahap 1: Struktur Organisasi & Lokasi',
    description: 'Langkah mendasar untuk mendefinisikan hierarki organisasi dan titik lokasi fisik operasional perusahaan.',
    items: [
      { 
        icon: <Database className="h-4 w-4" />, 
        label: 'Sections', 
        desc: 'Definisikan departemen (misal: IT, HR, Produksi). Berguna untuk melacak penanggung jawab aset di level organisasi.', 
        example: 'IT, HRD, Produksi, Maintenance',
        payload: { 
          section: "IT", 
          section_full: "Information Technology", 
          keterangan: "Head Office IT Dept",
          not_active: false 
        }
      },
      { 
        icon: <Map className="h-4 w-4" />, 
        label: 'Estates', 
        desc: 'Daftarkan lokasi fisik atau area perkebunan (misal: Estate A). Memudahkan monitoring distribusi aset antar wilayah.', 
        example: 'Estate Tanjung, Office HO, Workshop',
        payload: { 
          estate_id: "ETJ", 
          estate: "Estate Tanjung"
        }
      }
    ]
  },
  {
    title: 'Tahap 2: Katalog Barang & Material',
    description: 'Menyusun katalog referensi untuk klasifikasi aset dan manajemen stok material/sparepart.',
    items: [
      { 
        icon: <Layers className="h-4 w-4" />, 
        label: 'Categories', 
        desc: 'Klasifikasikan aset (misal: Kendaraan, Komputer). Membantu dalam standarisasi pelaporan dan analisis siklus hidup.', 
        example: 'Alat Berat, Kendaraan, IT Equipment',
        payload: { name: "IT Equipment" }
      },
      { 
        icon: <Package className="h-4 w-4" />, 
        label: 'Materials', 
        desc: 'Katalog spesifikasi detail barang (misal: Laptop X1, Ban Dalam). Menjadi referensi utama saat input transaksi barang.', 
        example: 'Laptop ThinkPad X1, Ban Truk 1000-20',
        payload: { 
          code: "MAT-IT-001", 
          nama: "Laptop ThinkPad X1 Carbon Gen 11", 
          type: "Laptop", 
          category_id: 1, 
          unit: "UNIT", 
          matcode: "1002341", 
          sn: "S/N-123456", 
          min_stock: 5, 
          price: 25000000, 
          stock: 10, 
          pt: "PT. ITCI Hutani Manunggal", 
          section_id: 1, 
          not_active: false 
        }
      },
      { 
        icon: <Factory className="h-4 w-4" />, 
        label: 'Manufacturers', 
        desc: 'Daftar merk atau pabrikan aset (misal: Dell, Toyota). Memastikan konsistensi nama merk di seluruh sistem.', 
        example: 'Apple, Lenovo, Komatsu, Caterpillar',
        payload: { name: "Lenovo" }
      },
      { 
        icon: <Tag className="h-4 w-4" />, 
        label: 'Asset Types', 
        desc: 'Definisikan jenis aset (misal: Laptop, Excavator). Digunakan untuk klasifikasi teknis saat registrasi aset baru.', 
        example: 'Laptop, Bulldozer, AC, Printer',
        payload: { name: "Laptop" }
      }
    ]
  },
  {
    title: 'Tahap 3: Personel & Alokasi Biaya',
    description: 'Menyiapkan data pengguna serta parameter finansial untuk akuntabilitas dan audit pengeluaran.',
    items: [
      { 
        icon: <Users className="h-4 w-4" />, 
        label: 'Members', 
        desc: 'Daftar karyawan pemegang aset. Mencatat SAP ID dan NIK untuk keperluan verifikasi dan tanggung jawab personal.', 
        example: 'John Doe (SAP: 100234), Budi (SAP: 100456)',
        payload: { 
          sap_id: "10023456", 
          nik: "2109001234", 
          nama: "John Doe", 
          position: "IT Infrastructure Support", 
          supervisor: "Jane Smith", 
          email: "john.doe@industat.com", 
          section_id: 1, 
          not_active: false 
        }
      },
      { 
        icon: <Wallet className="h-4 w-4" />, 
        label: 'Cost Centers', 
        desc: 'Tentukan pusat biaya untuk tiap unit. Penting untuk alokasi anggaran pemeliharaan dan pelacakan beban biaya.', 
        example: 'CC-IT01, CC-MAINT-02',
        payload: { 
          cost_center: "CC-IT01", 
          dept: "IT Department", 
          estate: "HO", 
          join_estate: "HO" 
        }
      }
    ]
  },
  {
    title: 'Tahap 4: Registrasi Aset Utama',
    description: 'Memberikan identitas digital bagi setiap aset fisik berharga milik perusahaan.',
    items: [
      { 
        icon: <ClipboardList className="h-4 w-4" />, 
        label: 'Asset Reg', 
        desc: 'Pendaftaran aset baru dengan nomor seri dan nilai buku. Menjadi dasar dari seluruh riwayat histori aset ke depannya.', 
        example: 'ASSET-2024-001 (Laptop X1), ASSET-2024-002 (Truk Hino)',
        payload: { 
          asset_type_id: 1, 
          manufacturer_id: 1, 
          series: "ThinkPad X1 Carbon Gen 11", 
          matcode: "MAT-IT-001", 
          description: "ThinkPad X1 Carbon Gen 11 i7/16GB/1TB", 
          section_id: 1, 
          not_active: false 
        }
      }
    ]
  },
  {
    title: 'Tahap 5: Operasional Inventaris',
    description: 'Manajemen aktivitas harian untuk menjaga akurasi data stok dan kondisi aset tetap prima.',
    items: [
      { 
        icon: <ArrowLeftRight className="h-4 w-4" />, 
        label: 'Transactions', 
        desc: 'Catat mutasi masuk/keluar material. Menjaga agar jumlah fisik stok selalu sinkron dengan data digital di sistem.', 
        example: 'Pengambilan Ban Baru (Keluar), Penerimaan Oli (Masuk)',
        payload: { 
          material_id: "MAT-IT-001", 
          qty: 1, 
          type: "OUT", 
          ref_no: "REQ-2024-03-001", 
          remarks: "Penggantian laptop operasional", 
          transaction_date: "2024-03-18" 
        }
      },
      { 
        icon: <History className="h-4 w-4" />, 
        label: 'Assets', 
        desc: 'Pantau kondisi real-time, lokasi, dan histori aset. Membantu keputusan perbaikan atau pengadaan aset baru.', 
        example: 'Status: Active, Condition: Good, Location: Estate A',
        payload: { 
          asset_id: 1, 
          status: "Active", 
          condition: "Good", 
          current_location: "Estate Tanjung", 
          remarks: "In regular use by IT Dept" 
        }
      }
    ]
  }
];

const GuidePage: React.FC = () => {
  useTitle('Guide');
  const navigate = useNavigate();
  const [activePayload, setActivePayload] = useState<{ label: string; data: any } | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary/10 text-primary mb-2 shadow-inner ring-4 ring-primary/5">
          <HelpCircle className="h-8 w-8 text-primary shadow-sm" />
        </div>
        <h1 className="text-4xl font-black text-forest-900 tracking-tight">System Setup Guide</h1>
        <p className="text-lg text-forest-500 max-w-2xl mx-auto font-medium">
          Ikuti panduan langkah demi langkah ini untuk mengkonfigurasi dan mulai menggunakan 
          <span className="text-primary font-bold"> Portal Asset</span> secara optimal.
        </p>
      </div>

      {/* Steps Container */}
      <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
        {steps.map((step, idx) => (
          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Dot */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-gray-50 text-forest-400 font-bold text-sm shadow-xl z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
              {idx + 1}
            </div>

            {/* Content Card */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-3xl bg-white border border-gray-100 shadow-md shadow-black/[0.02] hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-5 w-5 text-forest-200 group-hover:text-primary transition-colors" />
                <h3 className="text-xl font-black text-forest-900 tracking-tight leading-none italic uppercase">
                   {step.title}
                </h3>
              </div>
              <p className="text-sm text-forest-500 mb-6 font-medium leading-relaxed">
                {step.description}
              </p>

              <div className="grid gap-3">
                {step.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-start gap-4 p-3 rounded-2xl bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-sm transition-all group/item">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-forest-400 group-hover/item:text-primary transition-colors shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-forest-900 mb-0.5">{item.label}</p>
                      <p className="text-[11px] font-medium text-forest-400 leading-tight mb-2">{item.desc}</p>
                      {item.example && (
                        <div className="bg-primary/5 rounded-lg px-2 py-1.5 border border-primary/10 relative group/example">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Contoh:</p>
                            {item.payload && (
                              <button 
                                onClick={() => setActivePayload({ label: item.label, data: item.payload })}
                                className="text-primary hover:text-primary-hover transition-colors p-0.5"
                                title="Lihat Payload Data"
                              >
                                <HelpCircle className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] font-semibold text-forest-600 block italic leading-tight pr-4">{item.example}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="bg-forest-900 rounded-[32px] p-10 text-center relative overflow-hidden shadow-2xl">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-wood-primary/10 rounded-full blur-[80px] translate-x-1/2 translate-y-1/2" />
        
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white mb-3">Siap untuk Memulai?</h2>
          <p className="text-forest-400 max-w-lg mx-auto mb-8 font-medium">
            Jika master data sudah lengkap, Anda bisa langsung mendaftarkan aset pertama Anda 
            untuk melihat kekuatan sistem tracking kami.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => navigate('/asset-regs')}
              className="px-8 py-3.5 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
            >
              Input Aset Baru
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3.5 bg-white/10 text-white font-black rounded-2xl hover:bg-white/20 backdrop-blur-sm transition-all"
            >
              Buka Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Payload Modal */}
      <Modal 
        isOpen={!!activePayload} 
        onClose={() => setActivePayload(null)} 
        title={`Contoh Payload: ${activePayload?.label}`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-forest-500 mb-2">
            <Code className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-widest">JSON Format</p>
          </div>
          <div className="bg-forest-900 rounded-2xl p-4 overflow-x-auto shadow-inner border border-forest-800">
            <pre className="text-wood-primary text-xs font-mono leading-relaxed">
              {JSON.stringify(activePayload?.data, null, 2)}
            </pre>
          </div>
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-xs text-forest-600 font-medium leading-relaxed">
              <span className="font-black text-primary uppercase">Note:</span> Data di atas adalah struktur JSON yang dikirimkan ke server saat melakukan penyimpanan data <strong>{activePayload?.label}</strong>.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GuidePage;
