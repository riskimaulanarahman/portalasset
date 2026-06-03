import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { ArrowLeft, Calendar, MapPin, Tag, Briefcase, History, Wrench, Info } from 'lucide-react';
import useTitle from '../hooks/useTitle';


const AssetDetailPage: React.FC = () => {
    const { regId } = useParams<{ regId: string }>();
    useTitle(`Asset ${regId}`);

    const navigate = useNavigate();

    const { data: asset, isLoading, error } = useQuery({
        queryKey: ['asset', regId],
        queryFn: async () => {
            const response = await api.get(`/assets/${regId}`);
            return response.data.data;
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading asset details...</div>;
    if (error || !asset) return <div className="p-8 text-center text-red-500 bg-red-50 m-6 rounded-xl">Error: Asset not found or failed to load.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => navigate('/assets')}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{asset.reg_id}</h1>
                        <p className="text-sm text-gray-500">Physical Asset Details</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-xs rounded-full font-semibold ${asset.not_active ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {asset.not_active ? 'Inactive' : 'Active'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Information Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center">
                            <Info className="h-4 w-4 text-blue-500 mr-2" />
                            <h2 className="font-semibold text-gray-800">General Information</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center">
                                        <Tag className="h-3 w-3 mr-1" /> Asset No
                                    </label>
                                    <p className="mt-1 text-gray-900 font-medium">{asset.asset_no || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unit ID</label>
                                    <p className="mt-1 text-gray-900">{asset.unit_id || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" /> Registration Date
                                    </label>
                                    <p className="mt-1 text-gray-900">{asset.date || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</label>
                                    <p className="mt-1 text-gray-900 font-mono text-sm">{asset.serial_no || '-'}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type / Brand / Series</label>
                                    <p className="mt-1 text-gray-900 font-medium">{asset.type} - {asset.manufacture} ({asset.series})</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center">
                                        <MapPin className="h-3 w-3 mr-1" /> Section
                                    </label>
                                    <p className="mt-1 text-gray-900">{asset.section?.section || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center">
                                        <MapPin className="h-3 w-3 mr-1" /> Estate
                                    </label>
                                    <p className="mt-1 text-gray-900">{asset.estate?.estate || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Allocation (Alokasi)</label>
                                    <p className="mt-1 text-gray-900">{asset.alokasi || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center">
                                        <Briefcase className="h-3 w-3 mr-1" /> Vendor & Source
                                    </label>
                                    <p className="mt-1 text-gray-900">{asset.vendor?.nama || '-'} {asset.source ? `(${asset.source})` : ''}</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                            <p className="mt-1 text-sm text-gray-700">{asset.keterangan || 'No description provided.'}</p>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center">
                            <History className="h-4 w-4 text-purple-500 mr-2" />
                            <h2 className="font-semibold text-gray-800">Asset History</h2>
                        </div>
                        <div className="p-0">
                            <div className="border-b border-gray-200">
                                <nav className="flex -mb-px px-6" aria-label="Tabs">
                                    <button className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm mr-8">
                                        Transactions
                                    </button>
                                    <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                                        Maintenance
                                    </button>
                                </nav>
                            </div>
                            <div className="p-6">
                                {asset.transactions && asset.transactions.length > 0 ? (
                                    <div className="space-y-4">
                                        {asset.transactions.map((trans: any, idx: number) => (
                                            <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="bg-white p-2 rounded-full shadow-sm">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{trans.type_trans}</p>
                                                    <p className="text-xs text-gray-500">{trans.trans_date} • {trans.create_by}</p>
                                                    <p className="mt-1 text-xs text-gray-600 italic">"{trans.keterangan || '-'}"</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-400 italic text-sm">No transaction history found.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar/Quick Stats Card */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
                        <h3 className="text-lg font-semibold mb-4 opacity-90">Asset Status Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <span className="text-sm opacity-80">Total Maintenances</span>
                                <span className="font-bold text-xl">{asset.maintenances?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <span className="text-sm opacity-80">Total Transactions</span>
                                <span className="font-bold text-xl">{asset.transactions?.length || 0}</span>
                            </div>
                            <div className="pt-2">
                                <p className="text-xs opacity-70 mb-1">Created By</p>
                                <p className="text-sm font-medium">{asset.create_by || 'system'}</p>
                                <p className="text-[10px] opacity-60">{asset.create_date}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                         <h3 className="text-gray-800 font-semibold mb-4 flex items-center">
                            <Wrench className="h-4 w-4 text-orange-500 mr-2" />
                            Recent Maintenance
                         </h3>
                         {asset.maintenances && asset.maintenances.length > 0 ? (
                             <div className="space-y-4">
                                 {asset.maintenances.slice(0, 3).map((maint: any, idx: number) => (
                                     <div key={idx} className="text-sm border-l-2 border-orange-200 pl-3">
                                         <p className="font-medium text-gray-800">{maint.issue || 'Maintenance'}</p>
                                         <p className="text-[10px] text-gray-500">{maint.date}</p>
                                     </div>
                                 ))}
                             </div>
                         ) : (
                             <p className="text-sm text-gray-400 italic">No maintenance record.</p>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetDetailPage;
