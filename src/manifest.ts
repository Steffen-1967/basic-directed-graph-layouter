/**
 * @file manifest.ts
 * Central type definitions and configuration for the process visualization.
 */

export interface MultiLangEntry {
    lcid: number;
    value: string;
}

export type MultiLangProp = MultiLangEntry[];

/**
 * @function toMultiLang
 * @description Helper to ensure a property is in MultiLang format.
 * @param {any} val - The value to convert.
 * @param {string} fallback - The fallback string if value is missing.
 * @returns {MultiLangProp} The MultiLang property object.
 */
export function toMultiLang(val: any, fallback: string = ''): MultiLangProp {
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object' && 'value' in val) return [val as any];
    return [{ lcid: 1031, value: String(val || fallback) }];
}

/**
 * Gets the value from a MultiLangProp for a given LCID.
 * Falls back to the first entry if the LCID is not found.
 * @param prop The MultiLangProp to search in.
 * @param lcid The LCID to search for (default: 1031 for German).
 * @returns The value for the LCID or an empty string if prop is empty/missing.
 */
export function getLangValue(prop: MultiLangProp | undefined, lcid: number = 1031): string {
    if (!prop || !Array.isArray(prop) || prop.length === 0) {
        return '';
    }
    const entry = prop.find(e => e.lcid === lcid);
    if (entry) {
        return entry.value;
    }
    // Fallback to first entry
    return prop[0].value;
}

/** Central versionable types for the graph nodes. */
export enum VersionableType {
    ByParent = 'by-parent',
    Independently = 'independently',
    No = 'no'
}

/** Central layout types for the graph visualization. */
export enum LayoutType {
    Flow = 'Flow',
    CompactFlow = 'CompactFlow',
    TaskList = 'TaskList',
    Box = 'Box',
    Tree = 'Tree',
    ForceAtlas = 'ForceAtlas'
}

/**
 * Checks if a layout allows any form of editing.
 */
export function isLayoutEditable(type: LayoutType | string): boolean {
    const t = String(type || '').trim().toLowerCase();
    return [
        LayoutType.Flow.toLowerCase(), 
        LayoutType.CompactFlow.toLowerCase(), 
        LayoutType.TaskList.toLowerCase(), 
        LayoutType.Tree.toLowerCase(), 
        LayoutType.Box.toLowerCase()
    ].includes(t);
}

/**
 * Checks if a layout allows structural editing (adding/deleting nodes and edges).
 */
export function isLayoutStructureEditable(type: LayoutType | string): boolean {
    const t = String(type || '').trim().toLowerCase();
    return [
        LayoutType.Flow.toLowerCase(), 
        LayoutType.Tree.toLowerCase(), 
        LayoutType.Box.toLowerCase()
    ].includes(t);
}

/**
 * Determines if a switch to a target layout is possible and meaningful from the master layout.
 */
export function isLayoutSwitchable(masterType: LayoutType | string | null | undefined, targetType: LayoutType | string | null | undefined): boolean {
    if (!masterType || !targetType) return false;
    const mt = String(masterType).trim().toLowerCase();
    const tt = String(targetType).trim().toLowerCase();
    
    if (mt === tt) return true;
    
    const allowedTransitionsFrom: Record<string, string[]> = {
        [LayoutType.Flow.toLowerCase()]: [LayoutType.CompactFlow.toLowerCase(), LayoutType.TaskList.toLowerCase()],
        [LayoutType.CompactFlow.toLowerCase()]: [LayoutType.Flow.toLowerCase(), LayoutType.Tree.toLowerCase()], 
        [LayoutType.TaskList.toLowerCase()]: [LayoutType.Flow.toLowerCase(), LayoutType.CompactFlow.toLowerCase(), LayoutType.Tree.toLowerCase()], 
        [LayoutType.Box.toLowerCase()]: [LayoutType.TaskList.toLowerCase()],
        [LayoutType.Tree.toLowerCase()]: [LayoutType.TaskList.toLowerCase()],
        [LayoutType.ForceAtlas.toLowerCase()]: [] 
    };
    
    const possibleTargets = allowedTransitionsFrom[mt];
    return possibleTargets ? possibleTargets.includes(tt) : false;
}

/** Interface for application views. */
export interface AppView {
    viewId: string;
    mount(container: HTMLElement, headerContainer: HTMLElement): void;
    unmount(): void;
    canExit(): Promise<boolean>;
}

export const DataStructureVersion = 'mylife.org v0.2';

/** Helper for locked calculation based on version string */
export function isLockedByVersionNumber (version?: string, fallback?: boolean): boolean {
	if (!version) return fallback || false;
	const parts = version.split('.');
	return parts.length > 1 && parts[1] === '0';
};

/** Central edge types for the graph visualization. */
export enum EdgeType {
    Predecessor = 'predecessor',
    Uses = 'uses',
    Parent = 'parent',
    Responsible = 'responsible',
    Input = 'input',
    Output = 'output',
    InputOptional = 'input (optional)',
    OutputOptional = 'output (optional)'
}

export function getSelectableEdgeTypes(currentType?: EdgeType | string | null): EdgeType[] {
    if (!currentType) return Object.values(EdgeType);
    const t = String(currentType).toLowerCase();
    if (t === 'predecessor') return [EdgeType.Predecessor];
    if (t === 'uses') return [EdgeType.Uses];
    if (t === 'parent') return [EdgeType.Parent];
    if (t === 'responsible') return [EdgeType.Responsible];
    if (t.includes('input')) return [EdgeType.Input, EdgeType.InputOptional];
    if (t.includes('output')) return [EdgeType.Output, EdgeType.OutputOptional];
    return [currentType as EdgeType];
}

/** The type will become the label of an edge in the graph daatabase */
export interface GraphEdge {
    id: string;
    weight: number;
    type?: EdgeType;
    description?: MultiLangProp;
    locked: boolean;
}

/** All available node types in the system. */
export enum NodeType {
    Event = 'Event',
    Task = 'Task',
    Rule = 'Rule',
    SubProcess = 'SubProcess',
    OrgUnit = 'OrgUnit',
    Role = 'Role',
    Constraint = 'Constraint',
    BusinessObject = 'BusinessObject',
    Resource = 'Resource',
    Scenario = 'Scenario',
    UseCase = 'UseCase',
    SubProcessContainer = 'SubProcessContainer',
    ScenarioContainer = 'ScenarioContainer',
    OrgUnitContainer = 'OrgUnitContainer',
    RoleContainer = 'RoleContainer',
    ConstraintContainer = 'ConstraintContainer',
    BusinessObjectContainer = 'BusinessObjectContainer',
    ResourceContainer = 'ResourceContainer'
}

export function isNodeType(value: string): value is NodeType {
    return Object.values(NodeType).includes(value as NodeType);
}

export type ContainerHandling = 'excludeContainer' | 'includeContainer' | 'onlyContainer';

export function isContainerType(value: string | undefined | null): boolean {
    if (!value) return false;
    return value.endsWith('Container');
}

export function isScenario(value: string | undefined | null): boolean {
    return value === NodeType.Scenario;
}

export function isUseCase(value: string | undefined | null): boolean {
    return value === NodeType.UseCase;
}

export function isUseCaseOrScenario(value: string | undefined | null): boolean {
    return (value === NodeType.UseCase || value === NodeType.Scenario);
}

export function isScenarioContainable(value: string | undefined | null, containerHandling: ContainerHandling = 'includeContainer'): boolean {
    if (!value) return false;
    if (containerHandling === 'excludeContainer') {
        return (value === NodeType.Resource || value === NodeType.BusinessObject || value === NodeType.Constraint || value === NodeType.OrgUnit || value === NodeType.Role || value === NodeType.SubProcess);
    } else if (containerHandling === 'onlyContainer') {
        return (value === NodeType.ResourceContainer  || value === NodeType.BusinessObjectContainer || value === NodeType.ConstraintContainer || value === NodeType.OrgUnitContainer || value === NodeType.RoleContainer || value === NodeType.SubProcessContainer);
    }
    return (value === NodeType.Resource || value === NodeType.ResourceContainer || value === NodeType.BusinessObject || value === NodeType.BusinessObjectContainer || value === NodeType.Constraint || value === NodeType.ConstraintContainer || value === NodeType.OrgUnit || value === NodeType.OrgUnitContainer || value === NodeType.Role || value === NodeType.RoleContainer || value === NodeType.SubProcess || value === NodeType.SubProcessContainer);
}

export function isUseCaseContainable(value: string | undefined | null, containerHandling: ContainerHandling = 'includeContainer'): boolean {
    if (!value) return false;
    if (containerHandling === 'excludeContainer') {
        if (value === NodeType.Scenario) return true;
        return isScenarioContainable(value, containerHandling);
    } else if (containerHandling === 'onlyContainer') {
        return isScenarioContainable(value, containerHandling);
    }
    if (value === NodeType.Scenario) return true;
    return isScenarioContainable(value, containerHandling);
}

export function isSubProcess(value: string | undefined | null, containerHandling: ContainerHandling = 'includeContainer'): boolean {
    if (!value) return false;
    if (containerHandling === 'excludeContainer') return value === NodeType.SubProcess;  
    else if (containerHandling === 'onlyContainer') return value === NodeType.SubProcessContainer;
    return (value === NodeType.SubProcess || value === NodeType.SubProcessContainer);
}

export function isSubProcessContainable(value: string | undefined | null): boolean {
    if (!value) return false;
    return (value === NodeType.Task || value === NodeType.Rule || value === NodeType.Event);
}

export function isRepositoryContainable(value: string | undefined | null, containerHandling: ContainerHandling = 'includeContainer'): boolean {
    if (!value) return false;
    if (containerHandling === 'excludeContainer') return (value === NodeType.Resource || value === NodeType.BusinessObject || value === NodeType.Constraint || value === NodeType.OrgUnit || value === NodeType.Role);
    else if (containerHandling === 'onlyContainer') return (value === NodeType.ResourceContainer || value === NodeType.BusinessObjectContainer || value === NodeType.ConstraintContainer || value === NodeType.OrgUnitContainer || value === NodeType.RoleContainer); 
    return (value === NodeType.Resource || value === NodeType.ResourceContainer || value === NodeType.BusinessObject || value === NodeType.BusinessObjectContainer || value === NodeType.Constraint || value === NodeType.ConstraintContainer || value === NodeType.OrgUnit || value === NodeType.OrgUnitContainer || value === NodeType.Role || value === NodeType.RoleContainer);
}  

/** Central evaluation types for nodes. */
export enum EvaluationType {
    Event = 'event',
    MultipleAnd = 'multipleAnd',
    SingleAnd = 'singleAnd',
    MultipleOr = 'multipleOr',
    SingleOr = 'singleOr'
}

/** Stereotypes for logical nodes. */
export enum NodeStereotype {
    AND = 'and',
    OR = 'or',
    XOR = 'xor'
}

export interface GraphNode {
    id: string;
    versionable?: VersionableType;
    versionContainer?: string;
    version?: string;
    locked: boolean;
    type: NodeType;
    stereotype?: NodeStereotype;
    name: MultiLangProp;
    incoming: GraphEdge[];
    outgoing: GraphEdge[];
    description?: MultiLangProp;
    overrideFillColor?: string | null;
    overrideStrokeColor?: string | null;
    nodes?: GraphNode[];
    _x?: number;
    _y?: number;
    _level?: number;
    _isTopRow?: boolean;
    _isDirty?: boolean;
    _incomingEvaluation?: EvaluationType;
    _outgoingEvaluation?: EvaluationType;
    _predecessorsCalculated?: GraphNode[];
    _successorsCalculated?: GraphNode[];
}

export function isStructureFormingEdge(type?: string): boolean {
    if (!type) return true; // Default to true for untyped edges
    const t = type.toLowerCase();
    return [EdgeType.Predecessor, 'evaluates', 'output'].includes(t as any);
}

export interface LayoutPreferences {
    maxColumns?: number;
    columnWidth?: number;
    rowHeight?: number;
    switchLevel?: number;
    switchToListLevel?: number;
}

export interface Envelope {
    exporter: string;
    name: MultiLangProp;
    description: MultiLangProp;
    layoutType: LayoutType;
    layoutPreferences: LayoutPreferences;
    root: string;  
    nodes: GraphNode[];  
}

export function newEnvelope(exporter: string | null | undefined = null,
    name: MultiLangProp | null | undefined = null,
    description: MultiLangProp | null | undefined = null,
    layoutType: LayoutType | null | undefined = null,
    root: string | null | undefined = null,
    nodes: GraphNode[] | null | undefined = null): Envelope {
    return {
        exporter: exporter || DataStructureVersion,
        name: name || toMultiLang('unnamed'),
        description: description || toMultiLang(''),
        layoutType: layoutType|| LayoutType.Flow,
        layoutPreferences: {},
        root: root || '',
        nodes: nodes || []
    };
}

export type NodeIteratorCallback = (node: GraphNode, isRoot: boolean, depth: number) => void;

export function iterateAllNodes(envelope: Envelope, callback: NodeIteratorCallback): void {
    const rootId = envelope.root;
    const visitNode = (node: GraphNode, depth: number) => {
        const isRoot = node.id === rootId;
        callback(node, isRoot, depth);
        if (node.nodes && Array.isArray(node.nodes)) node.nodes.forEach(child => visitNode(child, depth + 1));
    };
    envelope.nodes.forEach(topLevelNode => visitNode(topLevelNode, 0));
}

export function collectAllNodes(envelope: Envelope, applyLayoutSpecifics: boolean): GraphNode[] {
    const lt = String(envelope.layoutType || '').trim().toLowerCase();
    const suppressRootNode = [
        LayoutType.Flow.toLowerCase(), 
        LayoutType.Box.toLowerCase(), 
        LayoutType.Tree.toLowerCase(), 
        LayoutType.ForceAtlas.toLowerCase()
    ].includes(lt);
    
    const allNodes: GraphNode[] = []; 
    const seenIds = new Set<string>(); 
    let rootNode: GraphNode | null = null;
    
    if (applyLayoutSpecifics && suppressRootNode) {
        rootNode = findRootNode(envelope);
    }
    
    iterateAllNodes(envelope, (node) => { 
        if (rootNode === null || (rootNode !== null && rootNode !== node)) { 
            if (!seenIds.has(node.id)) { 
                allNodes.push(node); 
                seenIds.add(node.id); 
            } 
        } 
    });
    return allNodes;
}

export function findRootNode(envelope: Envelope): GraphNode | null {
    let rootNode: GraphNode | null = null;
    iterateAllNodes(envelope, (node, isRoot) => { if (isRoot) rootNode = node; });
    return rootNode;
}

export interface ListEntryInfo {
    fileName: string; lastModified: number; size: number; type: string; readonly layoutType: LayoutType; source: 'fs' | 'age';
    id?: string; name?: MultiLangProp; description?: MultiLangProp; version?: string;
}

export type NodeShape = 'circle' | 'diamond' | 'rect' | 'roundedRect' | 'roundedRectWithBox' | 'roundedRectWithEvaluators' | 'icon';

export interface NodeShapeDefinition {
    shape: NodeShape;
    Width: number;
    Height: number;
}

export interface RenderConfig {
    colors: Record<string, string>;
    shapes: Record<string, Record<string, NodeShapeDefinition>>;
    layout: {
        forceAtlas2: {
            gravity: number;
            scalingRatio: number;
            edgeWeightInfluence: number;
            scalingFactor: number;
            fitToCanvas: boolean;
        };
    };
    colW: number;
    rowH: number;
    interaction: {
        doubleClickDelay: number;
    };
}

export const RENDER_CONFIG: RenderConfig = {
    colors: {
        Event: '#ECE4FC',
        Rule: '#FFFFE0',
        Task: '#D4EDDA',
        SubProcess: '#90EE90', 
        OrgUnit: '#E8C466',
        Role: '#F8E8AA',
        Constraint: '#F8E1D1',
        BusinessObject: '#D3D3D3', Resource: '#D3D3D3',
        Scenario: '#90EE90', UseCase: '#9090EE',
        ParentArrow: '#66BB88',
        PredecessorArrow: '#88AA44',
        ResponsibleArrow: '#B8B866',
        InputArrow: '#AAA',
        OutputArrow: '#AAA',
        UsesArrow: '#BB9977',
        Stroke: '#495057',
        Text: '#212529',
        CommonArrow: '#888',
        AnchorHandle: '#8c97ff',
        AnchorHandleHover: '#ADD8E6'
    },
    shapes: {
        Flow: {
            Event: { shape: 'circle', Width: 45, Height: 45 },
			Rule: { shape: 'diamond', Width: 45, Height: 45 },
			Task: { shape: 'roundedRect', Width: 110, Height: 65 },
			SubProcess: { shape: 'roundedRectWithBox', Width: 110, Height: 65 },
			OrgUnit: { shape: 'circle', Width: 110, Height: 65 },
			Role: { shape: 'circle', Width: 110, Height: 65 },
			Constraint: { shape: 'rect', Width: 110, Height: 65 },
			BusinessObject: { shape: 'rect', Width: 110, Height: 65 },
			Resource: { shape: 'rect', Width: 110, Height: 65 },
			Scenario: { shape: 'roundedRect', Width: 110, Height: 65 },
			UseCase: { shape: 'roundedRect', Width: 110, Height: 65 }
        },
        CompactFlow: {
            Task: { shape: 'roundedRect', Width: 110, Height: 65 },
            SubProcess: { shape: 'roundedRectWithBox', Width: 110, Height: 65 },
            OrgUnit: { shape: 'circle', Width: 110, Height: 65 },
            Role: { shape: 'circle', Width: 110, Height: 65 },
            Constraint: { shape: 'rect', Width: 110, Height: 65 },
            BusinessObject: { shape: 'rect', Width: 110, Height: 65 },
            Resource: { shape: 'rect', Width: 110, Height: 65 },
            Scenario: { shape: 'roundedRect', Width: 110, Height: 65 },
            UseCase: { shape: 'roundedRect', Width: 110, Height: 65 }
        },

        TaskList: {
            Event: { shape: 'circle', Width: 20, Height: 20 }, 
            Rule: { shape: 'diamond', Width: 20, Height: 20 }, 
            Task: { shape: 'roundedRect', Width: 36, Height: 22 }, 
            SubProcess: { shape: 'roundedRectWithBox', Width: 36, Height: 22 }, 
            OrgUnit: { shape: 'circle', Width: 36, Height: 22 }, 
            Role: { shape: 'circle', Width: 36, Height: 22 }, 
            Constraint: { shape: 'rect', Width: 36, Height: 22 }, 
            BusinessObject: { shape: 'rect', Width: 36, Height: 22 }, 
            Resource: { shape: 'rect', Width: 36, Height: 22 }, 
            Scenario: { shape: 'roundedRect', Width: 36, Height: 22 }, 
            UseCase: { shape: 'roundedRect', Width: 36, Height: 22 }
        },
        Box: {
            Event: { shape: 'circle', Width: 45, Height: 45 },
			Rule: { shape: 'diamond', Width: 45, Height: 45 },
			Task: { shape: 'roundedRect', Width: 110, Height: 65 },
			SubProcess: { shape: 'roundedRectWithBox', Width: 110, Height: 65 },
			OrgUnit: { shape: 'circle', Width: 110, Height: 65 },
			Role: { shape: 'circle', Width: 110, Height: 65 },
			Constraint: { shape: 'rect', Width: 110, Height: 65 },
			BusinessObject: { shape: 'rect', Width: 110, Height: 65 },
			Resource: { shape: 'rect', Width: 110, Height: 65 },
			Scenario: { shape: 'roundedRect', Width: 110, Height: 65 },
			UseCase: { shape: 'roundedRect', Width: 110, Height: 65 }
        },
        Tree: {
            Event: { shape: 'circle', Width: 45, Height: 45 },
			Rule: { shape: 'diamond', Width: 45, Height: 45 },
			Task: { shape: 'roundedRect', Width: 110, Height: 65 },
			SubProcess: { shape: 'roundedRectWithBox', Width: 110, Height: 65 },
			OrgUnit: { shape: 'circle', Width: 110, Height: 65 },
			Role: { shape: 'circle', Width: 110, Height: 65 },
			Constraint: { shape: 'rect', Width: 110, Height: 65 },
			BusinessObject: { shape: 'rect', Width: 110, Height: 65 },
			Resource: { shape: 'rect', Width: 110, Height: 65 },
			Scenario: { shape: 'roundedRect', Width: 110, Height: 65 },
			UseCase: { shape: 'roundedRect', Width: 110, Height: 65 }
        },
        ForceAtlas: {
            Event: { shape: 'circle', Width: 50, Height: 50 },
			Rule: { shape: 'circle', Width: 50, Height: 50 },
			Task: { shape: 'circle', Width: 50, Height: 50 },
			SubProcess: { shape: 'circle', Width: 50, Height: 50 },
			OrgUnit: { shape: 'circle', Width: 50, Height: 50 },
			Role: { shape: 'circle', Width: 50, Height: 50 },
			Constraint: { shape: 'circle', Width: 50, Height: 50 },
			BusinessObject: { shape: 'circle', Width: 50, Height: 50 },
			Resource: { shape: 'circle', Width: 50, Height: 50 },
			Scenario: { shape: 'circle', Width: 50, Height: 50 },
			UseCase: { shape: 'circle', Width: 50, Height: 50 }
        }
    },
    layout: {
        forceAtlas2: {
            gravity: 120, // Higher values make the graph more compact, lower values spread it out more. Node overlapping is not so likely. Good start value: 120.
            scalingRatio: 80, // Higher values spread out the graph more, lower values make it more compact. Good start value: 80.
            edgeWeightInfluence: 0, // Disable edge weight influence for more uniform spacing
            scalingFactor: 1,
            fitToCanvas: false
        }
    },
    colW: 140,
    rowH: 100,
    interaction: {
        doubleClickDelay: 350
    }
};

if (typeof window !== 'undefined') {
    (window as any).RENDER_CONFIG = RENDER_CONFIG;
}

declare global {
    var lucide: { createIcons: (options?: any) => void; };
}
