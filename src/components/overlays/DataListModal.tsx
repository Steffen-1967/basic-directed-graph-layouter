'use client';

import React, { useState, useEffect } from 'react';
import { NetworkService } from '../../networkService';
import { ListEntryInfo, getLangValue } from '../../manifest';
import { FileText, Database, X, Check } from 'lucide-react';

interface DataListModalProps {
    mode: 'load' | 'import';
    networkService: NetworkService;
    onClose: () => void;
    onSelect: (item: ListEntryInfo) => void;
}

export default function DataListModal({ mode, networkService, onClose, onSelect }: DataListModalProps) {
    const [items, setItems] = useState<ListEntryInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<ListEntryInfo | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                let allItems: ListEntryInfo[] = [];
                const resultFromFS = await networkService.loadDataFilesFromServerFS();
                allItems = resultFromFS.fileList;
                
                if (mode !== 'import') {
                    const resultFromDB1 = await networkService.loadUsecasesFromServer();
                    allItems = allItems.concat(resultFromDB1.items);
                    
                    const resultFromDB2 = await networkService.loadEnvelopesFromServer();
                    allItems = allItems.concat(resultFromDB2.items);

                    const resultFromFirebase = await networkService.loadEnvelopesFromFirebase();
                    allItems = allItems.concat(resultFromFirebase.items);
                }
                
                setItems(allItems);
            } catch (error) {
                console.error("Error loading data list:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [mode, networkService]);

    const handleOk = () => {
        if (selectedItem) {
            // The UI Pipeline in OverlayManager now handles the sequence 
            // (closing this modal first, then proceeding with selection).
            onSelect(selectedItem);
        }
    };

    return (
        <div className="modal-overlay" style={{ display: 'flex' }}>
            <div className="modal-content import-modal" style={{ width: '66.6%', maxWidth: '80%', margin: 'auto' }}>
                <h3>{mode === 'import' ? 'Daten importieren' : 'Daten auswählen'}</h3>
                
                <div className="import-list-container">
                    <table className="import-table">
                        <thead>
                            <tr>
                                <th className="col-icon"></th>
                                <th className="col-name" style={{ textAlign: 'left' }}>Name</th>
                                <th className="col-version" style={{ textAlign: 'center' }}>Version</th>
                                <th className="col-date" style={{ textAlign: 'center' }}>Datum</th>
                                <th className="col-size" style={{ textAlign: 'center' }}>Größe</th>
                                <th className="col-content" style={{ textAlign: 'center' }}>Inhalt</th>
                                <th className="col-layout" style={{ textAlign: 'center' }}>Layout</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Lade Daten...</td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Keine Daten gefunden.</td>
                                </tr>
                            ) : (
                                items.map((item, index) => {
                                    const dateStr = item.lastModified ? new Date(item.lastModified).toLocaleString('de-DE') : '-';
                                    const sizeStr = item.size > 0 ? (item.size / 1024).toFixed(1) + ' KB' : '-';
                                    const displayName = (item.name && item.name.length > 0) ? getLangValue(item.name) : item.fileName;
                                    const isSelected = selectedItem === item;

                                    return (
                                        <tr 
                                            key={index} 
                                            className={isSelected ? 'selected' : ''}
                                            onClick={() => setSelectedItem(item)}
                                        >
                                            <td className="col-icon">
                                                {item.source === 'age' ? <Database size={16} /> : <FileText size={16} />}
                                            </td>
                                            <td className="col-name" style={{ textAlign: 'left' }}>{displayName}</td>
                                            <td className="col-version" style={{ textAlign: 'center' }}>{item.version || '-'}</td>
                                            <td className="col-date" style={{ textAlign: 'center' }}>{dateStr}</td>
                                            <td className="col-size" style={{ textAlign: 'center' }}>{sizeStr}</td>
                                            <td className="col-content" style={{ textAlign: 'center' }}>{item.type}</td>
                                            <td className="col-layout" style={{ textAlign: 'center' }}>{item.layoutType || '-'}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="modal-buttons">
                    <button 
                        className="btn-primary" 
                        disabled={!selectedItem}
                        onClick={handleOk}
                    >
                        <Check size={16} /> OK
                    </button>
                    <button className="btn-secondary" onClick={onClose}>
                        <X size={16} /> Abbrechen
                    </button>
                </div>
            </div>
        </div>
    );
}
