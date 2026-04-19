'use client';

import { createIcons, icons } from 'lucide';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  FolderOpen, GitBranch, LayoutGrid, List, Network, Save, Settings, 
  DatabaseZap, FileText, Maximize, Undo2, Redo2, Shrink, Lock, LockOpen, Check, X,
  Waypoints, Option, Minus
} from 'lucide-react';

import { initialAppState, stateEvents, OverlayType } from '../../state';
import { HistoryManager } from '../../historyManager';
import { LayoutEngine } from '../../layoutEngine';
import { NetworkService } from '../../networkService';
import { StateManager } from '../../stateManager';
import { InteractionService } from '../../interactionService';
import { OverlayManager } from '../../overlayManager';
import { 
  collectAllNodes, isLayoutEditable, isLayoutSwitchable, isLayoutStructureEditable, 
  findRootNode as findRootInManifest, LayoutType, getLangValue, toMultiLang, isLockedByVersionNumber,
  RENDER_CONFIG
} from '../../manifest';
import { getNodeDimensions } from '../../renderer';
import { SvgCanvas } from '../../components/svg/SvgCanvas';
import TaskList from '../../components/TaskList';
import OverlayController from '../../components/overlays/OverlayController';
import ToastContainer, { showToast } from '../../components/ToastContainer';

export default function TaskLibraryPage() {
  const [isEditable, setIsEditable] = useState(false);
  const [layoutType, setLayoutType] = useState<LayoutType>(LayoutType.Flow);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [selectedNodeState, setSelectedNodeState] = useState<any>(null);
  const [nodesToDrawState, setNodesToDrawState] = useState<any[]>([]);
  const [envelopeName, setEnvelopeName] = useState('Unbenanntes Szenario');
  const [version, setVersion] = useState('v1.0.0');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [isLockedByRoot, setIsLockedByRoot] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [headerPortalTarget, setHeaderPortalTarget] = useState<HTMLElement | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listViewRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const servicesRef = useRef<{
    stateManager?: StateManager;
    history?: HistoryManager;
    layoutEngine?: LayoutEngine;
    networkService?: NetworkService;
    interactionService?: InteractionService;
    overlayManager?: OverlayManager;
  }>({});

  const [appStateForRender, setAppStateForRender] = useState<any>(initialAppState);

  const updateReactState = () => {
    const { stateManager, history } = servicesRef.current;
    if (!stateManager) return;
    const state = stateManager.getState();
    setAppStateForRender({ ...state });
    setIsEditable(state.interaction.isEditable);
    setLayoutType(state.interaction.activeLayoutType || state.envelope?.layoutType || LayoutType.Flow);
    setSelectedNodeState(state.interaction.selectedNode);
    setNodesToDrawState(state.interaction.nodesToLayout || []);
    setCanUndo(history ? history.undoStack.length > 0 : false);
    setCanRedo(history ? history.redoStack.length > 0 : false);
    setIsLockedByOther(state.network.isLockedByOther);
    if (state.envelope) {
      setEnvelopeName(getLangValue(state.envelope.name) || 'Unbenanntes Szenario');
      const root = findRootInManifest(state.envelope);
      setVersion(root?.version || 'v1.0.0');
      const isVerLocked = root?.version ? isLockedByVersionNumber(root.version) : false;
      setIsLockedByRoot(root?.locked || isVerLocked);
    }
  };

  const renderAll = () => { updateReactState(); };
  const updateCanvasSize = () => { renderAll(); };
  const centerGraph = () => {
    const { stateManager, interactionService } = servicesRef.current;
    const canvas = canvasRef.current;
    if (!stateManager || !interactionService || !canvas) return;
    interactionService.centerGraph(canvas.clientWidth, canvas.clientHeight);
    renderAll();
  };

  useEffect(() => {
    const findPortal = () => {
      const el = document.getElementById('header-portal-root');
      if (el) { setHeaderPortalTarget(el); return true; }
      return false;
    };
    if (!findPortal()) {
      const interval = setInterval(() => { if (findPortal()) clearInterval(interval); }, 100);
      setTimeout(() => clearInterval(interval), 2000);
    }

    const state = JSON.parse(JSON.stringify(initialAppState));
    const stateManager = new StateManager(state);
    const history = new HistoryManager({ persistenceKey: 'mylife_default' });
    const layoutEngine = new LayoutEngine();
    
    const networkService = new NetworkService(stateManager, history, {
      updateEditButton: () => updateReactState(),
      updatePadlockIcon: () => updateReactState(),
      showLockModal: (msg) => { stateManager.openOverlay(OverlayType.Modal, { title: 'Sperre', message: msg, type: 'warning', buttons: [{ label: 'OK', onClick: () => stateManager.closeOverlay() }] }); },
      showNotification: (title, message, type = 'info') => { stateManager.openOverlay(OverlayType.Modal, { title, message, type: type as any, buttons: [{ label: 'OK', onClick: () => stateManager.closeOverlay() }] }); },
      showRecoveryModal: (message: string) => { return new Promise<boolean>((resolve) => { stateManager.openOverlay(OverlayType.Modal, { title: 'Wiederherstellung', message, type: 'warning', buttons: [{ label: 'Nein', onClick: () => { stateManager.closeOverlay(); resolve(false); } }, { label: 'Ja', onClick: () => { stateManager.closeOverlay(); resolve(true); }, className: 'btn-primary' }] }); }); },
      showSaveBeforeLeaveModal: (message: string) => { return new Promise<'save' | 'discard' | 'cancel'>((resolve) => { stateManager.openOverlay(OverlayType.Modal, { title: 'Ungespeicherte Änderungen', message, type: 'warning', buttons: [{ label: 'Abbrechen', onClick: () => { stateManager.closeOverlay(); resolve('cancel'); } }, { label: 'Verwerfen', onClick: () => { stateManager.closeOverlay(); resolve('discard'); }, className: 'btn-danger' }, { label: 'Speichern', onClick: () => { stateManager.closeOverlay(); resolve('save'); }, className: 'btn-primary' }] }); }); },
      refreshGraph: async () => {
        const cur = stateManager.getRawState();
        const currentLayout = cur.interaction.activeLayoutType || cur.envelope?.layoutType || LayoutType.Flow;
        const nodesToLayout = await layoutEngine.applyLayout(cur.nodes, currentLayout, cur.envelope?.layoutPreferences);
        if (currentLayout === LayoutType.Flow || currentLayout === LayoutType.Box) { stateManager.setNodesToLayout(null); }
        else { stateManager.setNodesToLayout(nodesToLayout); }
        updateReactState();
      },
      centerGraph: () => centerGraph(),
      updateCanvasSize: () => updateCanvasSize(),
      updateHistoryButtons: () => updateReactState(),
      resetSelection: () => { stateManager.selectNode(null); stateManager.selectEdge(null, null); updateReactState(); },
      envelopeLoadedCallback: (name) => {
        setEnvelopeName(getLangValue(name));
        stateManager.setActiveLayoutType(null as any);
        layoutEngine.clearCache();
        updateReactState();
      }
    });

    const overlayManager = new OverlayManager(state, history, networkService, stateManager, () => { renderAll(); });
    servicesRef.current = { stateManager, history, layoutEngine, networkService, overlayManager };
    layoutEngine.setNetworkService(networkService);

    const unsubscribeRender = stateEvents.subscribe((e) => { if (e.type === 'RENDER_REQUESTED') renderAll(); });
    window.addEventListener('resize', updateCanvasSize);
    setIsReady(true);

    return () => {
      unsubscribeRender(); 
      window.removeEventListener('resize', updateCanvasSize);
      const curState = servicesRef.current.stateManager?.getRawState();
      if (curState?.currentFileName) networkService.releaseLock(curState.currentFileName);
    };
  }, []);

  useEffect(() => {
    if (!isReady || !canvasRef.current || !tooltipRef.current) return;
    const { stateManager, networkService, layoutEngine } = servicesRef.current;
    if (!stateManager || !networkService || !layoutEngine) return;

    const interactionService = new InteractionService((stateManager as any).state, canvasRef.current, tooltipRef.current, {
      renderAll,
      showToolbox: (n, x, y) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const screenX = x + (rect?.left || 0);
        const screenY = y + (rect?.top || 0);
        stateManager.openOverlay(OverlayType.NodeToolbox, n, { x: screenX, y: screenY });
      },
      showEdgeToolbox: (e, x, y) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const screenX = x + (rect?.left || 0);
        const screenY = y + (rect?.top || 0);
        stateManager.openOverlay(OverlayType.EdgeToolbox, e, { x: screenX, y: screenY });
      },
      startNodeNameEdit: (n) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const cur = stateManager.getState();
        const currentLayout = cur.interaction.activeLayoutType || cur.envelope?.layoutType || LayoutType.Flow;
        const { width, height } = getNodeDimensions(n, currentLayout);
        const zoom = cur.view.zoom || 1;
        const x = (n._x! * zoom) + cur.view.offsetX + (rect?.left || 0) - (width * 0.5 * zoom) + 5;
        const y = (n._y! * zoom) + cur.view.offsetY + (rect?.top || 0) - (height * 0.5 * zoom) + 5;
        stateManager.openOverlay(OverlayType.NodeInlineEdit, { node: n, dimensions: { width: (width - 10) * zoom, height: (height - 10) * zoom } }, { x, y });
      }
    });
    servicesRef.current.interactionService = interactionService;

    const initEnvelopes = async () => {
      const result = await networkService.loadDataFilesFromServerFS();
      if (result?.fileList?.length > 0) {
        const startFile = result.fileList.find(f => f.fileName === 'test-01.json') || result.fileList[0];
        await networkService.loadDataForDisplayAndEdit(startFile.fileName, null);
        setTimeout(() => { centerGraph(); }, 300);
      }
    };
    initEnvelopes();
  }, [isReady]);

  const handleToggleEdit = async () => {
    const { stateManager, networkService } = servicesRef.current;
    if (!stateManager || !networkService) return;
    const state = stateManager.getRawState();
    const rootNode = state.envelope ? findRootInManifest(state.envelope) : null;
    const currentLayout = state.interaction.activeLayoutType || state.envelope?.layoutType || LayoutType.Flow;
    const isVersionLocked = rootNode?.version ? isLockedByVersionNumber(rootNode.version) : false; 
    if (state.network.isLockedByOther || rootNode?.locked || isVersionLocked || !isLayoutEditable(currentLayout)) {
      if (state.network.isLockedByOther) showToast('Envelope wird von einem anderen Benutzer bearbeitet.', 'warning');
      else if (rootNode?.locked || isVersionLocked) showToast('Dieses Envelope ist in dieser Version gesperrt.', 'warning');
      else if (!isLayoutEditable(currentLayout)) showToast(`Layout '${currentLayout}' erlaubt keine Bearbeitung.`, 'info');
      return;
    }
    if (!state.interaction.isEditable) {
      const fileName = state.currentFileName || 'default.json';
      const lockAcquired = await networkService.requestLock(fileName); 
      if (lockAcquired) {
        stateManager.setEditable(true);
        state.interaction.isStructureEditable = true;
        renderAll();
        showToast('Bearbeitungsmodus aktiviert.', 'info');
      }
    } else {
      networkService.releaseLock(state.currentFileName || 'default.json');
      stateManager.setEditable(false);
      state.interaction.isStructureEditable = false;
      renderAll();
      showToast('Bearbeitungsmodus deaktiviert.', 'info');
    }
  };

  const handleLayoutChange = async (newType: LayoutType) => {
    const { stateManager, networkService, layoutEngine } = servicesRef.current;
    if (!stateManager || !layoutEngine) return;
    const state = stateManager.getRawState();
    const masterType = state.envelope?.layoutType || LayoutType.Flow;
    if (!state.envelope || !isLayoutSwitchable(masterType, newType)) {
        showToast(`Layout-Wechsel von ${masterType} zu ${newType} nicht erlaubt.`, 'warning');
        return;
    }
    stateManager.setActiveLayoutType(newType);
    setLayoutType(newType); 
    if (!isLayoutEditable(newType) && state.interaction.isEditable) {
      stateManager.setEditable(false);
      networkService?.releaseLock(state.currentFileName || 'default.json');
      setIsEditable(false);
    }
    const rawState = stateManager.getState();
    const nodesToLayout = await layoutEngine.applyLayout(rawState.nodes, newType, rawState.envelope?.layoutPreferences);
    stateManager.setNodesToLayout(nodesToLayout);
    updateReactState();
    setTimeout(() => { centerGraph(); }, 150);
  };

  const handleUndo = () => { const { stateManager, history } = servicesRef.current; if (stateManager && history) { const s = stateManager.getState(); if (s.envelope) history.undo(s.envelope); } };
  const handleRedo = () => { const { stateManager, history } = servicesRef.current; if (stateManager && history) { const s = stateManager.getState(); if (s.envelope) history.redo(s.envelope); } };
  const handleSave = () => { const { stateManager, networkService } = servicesRef.current; if (stateManager && networkService) { const s = stateManager.getState(); if (s.currentFileName) networkService.saveData(s.currentFileName, s.currentDataSource); } };
  const handleNodeClickFromList = (node: GraphNode, event: React.MouseEvent) => {
    const { stateManager } = servicesRef.current;
    if (stateManager) {
      stateManager.selectNode(node);
      
      // Calculate toolbox position for TaskList layout
      const row = (event.currentTarget as HTMLElement);
      const rect = row.getBoundingClientRect();
      const toolboxWidth = 220; // Estimated width of the toolbox
      const viewportWidth = window.innerWidth;
      
      // Y: Centered over the row
      const y = rect.top + (rect.height / 2);
      
      // X: At click position, but constrained to viewport
      let x = event.clientX;
      if (x + toolboxWidth > viewportWidth - 20) {
          x = viewportWidth - toolboxWidth - 20;
      }
      if (x < 20) x = 20;
      
      stateManager.openOverlay(OverlayType.NodeToolbox, node, { x, y });
      updateReactState();
    }
  };

  if (!isReady) return <div className="loading">Initialisiere...</div>;

  const masterLayoutType = servicesRef.current.stateManager?.getRawState()?.envelope?.layoutType || LayoutType.Flow;

  return (
    <div className="task-library-container">
      {headerPortalTarget && createPortal(
        <div className="header-controls" style={{ width: '100%' }}>
          <button className="header-btn" title="Load" onMouseDown={(e) => { e.stopPropagation(); servicesRef.current.overlayManager?.handleDataList('load'); }}><FolderOpen size={18} /> Load</button>
          <span className="header-info-text">{envelopeName}</span>
          <div className="v-divider"></div>
          <span className="header-version">{version}</span>
          <button className="header-icon-btn-small" title="Center" onMouseDown={(e) => { e.stopPropagation(); centerGraph(); }}><Maximize size={16} /></button>
          <div className="layout-controls">
             <button className={`header-icon-btn-small ${layoutType === LayoutType.Flow ? 'btn-toggle-on' : ''}`} onMouseDown={(e) => { e.stopPropagation(); handleLayoutChange(LayoutType.Flow); }} title="Flow" disabled={!isLayoutSwitchable(masterLayoutType, LayoutType.Flow)}><Option size={16} /></button>
             <button className={`header-icon-btn-small ${layoutType === LayoutType.CompactFlow ? 'btn-toggle-on' : ''}`} onMouseDown={(e) => { e.stopPropagation(); handleLayoutChange(LayoutType.CompactFlow); }} title="Compact Flow" disabled={!isLayoutSwitchable(masterLayoutType, LayoutType.CompactFlow)}><Minus size={16} /></button>
             <button className={`header-icon-btn-small ${layoutType === LayoutType.Tree ? 'btn-toggle-on' : ''}`} onMouseDown={(e) => { e.stopPropagation(); handleLayoutChange(LayoutType.Tree); }} title="Tree" disabled={!isLayoutSwitchable(masterLayoutType, LayoutType.Tree)}><Network size={16} /></button>
             <button className={`header-icon-btn-small ${layoutType === LayoutType.Box ? 'btn-toggle-on' : ''}`} onMouseDown={(e) => { e.stopPropagation(); handleLayoutChange(LayoutType.Box); }} title="Box" disabled={!isLayoutSwitchable(masterLayoutType, LayoutType.Box)}><LayoutGrid size={16} /></button>
             <button className={`header-icon-btn-small ${layoutType === LayoutType.ForceAtlas ? 'btn-toggle-on' : ''}`} onMouseDown={(e) => { e.stopPropagation(); handleLayoutChange(LayoutType.ForceAtlas); }} title="Force Atlas" disabled={!isLayoutSwitchable(masterLayoutType, LayoutType.ForceAtlas)}><Waypoints size={16} /></button>
             <button className={`header-icon-btn-small ${layoutType === LayoutType.TaskList ? 'btn-toggle-on' : ''}`} onMouseDown={(e) => { e.stopPropagation(); handleLayoutChange(LayoutType.TaskList); }} title="Task List" disabled={!isLayoutSwitchable(masterLayoutType, LayoutType.TaskList)}><List size={16} /></button>
          </div>
          <div className="v-divider"></div>
          <span className="padlock-icon" title="Lock state">{isLockedByRoot ? <Lock size={18} /> : <LockOpen size={18} />}</span>
          <button className={`btn-toggle ${isEditable ? 'btn-toggle-on' : (isLockedByOther || isLockedByRoot ? 'btn-toggle-locked' : 'btn-toggle-off')}`} onMouseDown={(e) => { e.stopPropagation(); handleToggleEdit(); }} disabled={isLockedByOther || isLockedByRoot || !isLayoutEditable(layoutType)}>Edit: {isEditable ? 'yes' : (isLockedByOther || isLockedByRoot ? 'locked' : 'no')}</button>
          {isEditable && <button className="btn-save" onMouseDown={(e) => { e.stopPropagation(); handleSave(); }} title="Save"><Save size={18} /> Save</button>}
          <div className="v-divider"></div>
          <button className="header-icon-btn-small" title="Undo" onMouseDown={(e) => { e.stopPropagation(); handleUndo(); }} disabled={!canUndo}><Undo2 size={16} /></button>
          <button className="header-icon-btn-small" title="Redo" onMouseDown={(e) => { e.stopPropagation(); handleRedo(); }} disabled={!canRedo}><Redo2 size={16} /></button>
          <div className="admin-menu-container">
            <button className="header-icon-btn-small" title="Settings" onMouseDown={(e) => { e.stopPropagation(); setIsAdminMenuOpen(!isAdminMenuOpen); }}><Settings size={16} /></button>
            {isAdminMenuOpen && (
              <div className="dropdown-content"> 
                <div onMouseDown={(e) => { e.stopPropagation(); servicesRef.current.overlayManager?.handleDataList('import'); }}><DatabaseZap size={16} /> Import JSON</div>
                <div className="menu-item-disabled"><FileText size={16} /> Import MD</div>
              </div>
            )}
          </div>
        </div>, headerPortalTarget)}
      <div id="canvasContainer" ref={containerRef}>
        <div id="processCanvas" ref={canvasRef} style={{ width: '100%', height: '100%', display: layoutType === LayoutType.TaskList ? 'none' : 'block' }}>
          <SvgCanvas 
            state={appStateForRender} 
            onNodeSelect={(n) => {
              console.log(`[CALLSTACK] 1. onNodeSelect triggered for ${n.id}`);
              const { stateManager, interactionService } = servicesRef.current;
              if (stateManager && interactionService) {
                stateManager.selectNode(n);
                // TRICK: We must call interactionService to handle the click logic (Toolbox vs Edit)
                interactionService.handleNodeClick(n, n._x!, n._y!);
              }
            }} 
            onNodeHover={(n) => { 
              const { stateManager } = servicesRef.current;
              if (stateManager) {
                const s = stateManager.getState() as any;
                if (s.interaction.hoveredNode !== n) {
                  s.interaction.hoveredNode = n;
                  renderAll();
                }
              }
            }} 
            onNodeDoubleClick={(n) => {
              console.log(`[CALLSTACK] 1. onNodeDoubleClick triggered for ${n.id}`);
              const s = servicesRef.current.stateManager?.getState();
              if (s) servicesRef.current.interactionService?.handleNodeClick(n, n._x! + s.view.offsetX, n._y! + s.view.offsetY);
            }} 
            onEdgeSelect={(e) => {
              console.log(`[CALLSTACK] 1. onEdgeSelect triggered for ${e.fromId}->${e.toId}`);
              const s = servicesRef.current.stateManager?.getState();
              if (s) {
                servicesRef.current.stateManager?.selectEdge(e.fromId, e.toId);
                const from = s.nodes.find(n => n.id === e.fromId);
                const to = s.nodes.find(n => n.id === e.toId);
                if (from && to) {
                  const midX = (from._x! + to._x!) * 0.5;
                  const midY = (from._y! + to._y!) * 0.5;
                  servicesRef.current.interactionService?.handleEdgeClick(e, midX, midY);
                }
              }
            }} 
            onEdgeHover={(e) => { 
              const { stateManager } = servicesRef.current;
              if (stateManager) {
                const s = stateManager.getState() as any;
                if (s.interaction.hoveredEdge !== e) {
                  s.interaction.hoveredEdge = e;
                  renderAll();
                }
              }
            }} 
            onCanvasMouseDown={() => {}} 
          />
        </div>
        {layoutType === LayoutType.TaskList && <div id="listViewContainer"><TaskList nodes={nodesToDrawState} selectedNode={selectedNodeState} onNodeClick={handleNodeClickFromList} /></div>}
        <div id="tooltip" className="tooltip" ref={tooltipRef}></div>
        <ToastContainer />
        {servicesRef.current.stateManager && <OverlayController stateManager={servicesRef.current.stateManager!} history={servicesRef.current.history!} networkService={servicesRef.current.networkService!} overlayManager={servicesRef.current.overlayManager!} renderAll={renderAll} />}
      </div>
    </div>
  );
}
