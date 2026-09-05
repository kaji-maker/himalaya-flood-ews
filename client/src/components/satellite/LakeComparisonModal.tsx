'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Layers,
  TrendingUp,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Info,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Columns,
  Sliders,
  Ruler,
  AlertTriangle,
  Eye,
  Activity,
  ZoomIn,
  ZoomOut,
  Move,
  Maximize2,
} from 'lucide-react';

export interface TimelapsePresetLake {
  code: string;
  name: string;
  basin: string;
  region: string;
  elevation: string;
  tag: string;
  isBreached?: boolean;
}

export const TIMELAPSE_PRESET_LAKES: TimelapsePresetLake[] = [
  {
    code: 'PDGL_NEP_KOSHI_007',
    name: 'Galong Co / Cirenmaco',
    basin: 'Bhote Koshi / Poiqu',
    region: 'Transboundary Tibet-Nepal Border',
    elevation: '4,380m',
    tag: 'Aug 2026 Surge Trigger',
  },
  {
    code: 'PDGL_NEP_KOSHI_001',
    name: 'Tsho Rolpa',
    basin: 'Tama Koshi',
    region: 'Rolwaling Himal, Nepal',
    elevation: '4,580m',
    tag: 'High Hazard Anchor',
  },
  {
    code: 'PDGL_NEP_KOSHI_002',
    name: 'Imja Tsho',
    basin: 'Dudh Koshi',
    region: 'Everest Khumbu, Nepal',
    elevation: '5,010m',
    tag: 'Canal Lowered 2016',
  },
  {
    code: 'PDGL_NEP_KOSHI_003',
    name: 'Lower Barun',
    basin: 'Barun / Arun',
    region: 'Makalu-Barun, Nepal',
    elevation: '4,540m',
    tag: '+197% Rapid Expansion',
  },
  {
    code: 'PDGL_NEP_GANDAKI_002',
    name: 'Birendra Lake',
    basin: 'Budhi Gandaki',
    region: 'Manaslu Arc, Nepal',
    elevation: '3,620m',
    tag: 'April 2024 Surge',
  },
  {
    code: 'PDGL_NEP_GANDAKI_001',
    name: 'Thulagi Lake',
    basin: 'Marsyangdi',
    region: 'Manaslu Arc, Nepal',
    elevation: '4,040m',
    tag: 'Steep Moraine Watch',
  },
  {
    code: 'PDGL_IND_SIKKIM_001',
    name: 'South Lhonak',
    basin: 'Teesta Basin',
    region: 'Sikkim Himalaya',
    elevation: '5,200m',
    tag: 'Oct 2023 GLOF Breach',
    isBreached: true,
  },
];

interface LakeComparisonModalProps {
  lakeId: string;
  lakeName: string;
  icimodCode?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface HistoricalEpoch {
  epoch_year: number;
  capture_date: string;
  sensor: string;
  resolution_m: number;
  area_sqm: number;
  area_sqkm: number;
  delta_area_pct: number;
  terminus_retreat_m: number;
  estimated_volume_million_m3: number;
  glaciological_note: string;
  image_chip_url: string;
  polygon_coords: number[][];
}

interface ComparisonData {
  lake_id: string;
  lake_name: string;
  icimod_code: string;
  basin?: string;
  elevation_m?: number;
  coordinates: [number, number];
  bbox?: [number, number, number, number];
  study_period: string;
  glacier_name?: string;
  net_summary: {
    initial_area_sqm_2004: number;
    current_area_sqm_2026: number;
    net_expansion_sqm: number;
    net_expansion_pct: number;
    annual_expansion_rate_sqm_year: number;
    total_glacier_terminus_retreat_m: number;
    net_volume_added_million_m3: number;
    primary_driver: string;
  };
  epochs: HistoricalEpoch[];
}

/**
 * Precision Geo-Referenced Overlay Configuration per Lake (viewBox 800 x 450)
 * Geographically calibrated to align the anchor crosshair with the true moraine dam
 * and the calving transect with the true glacier retreat axis in the satellite view.
 */
interface LakeGeometryConfig {
  anchor: {
    x: number;
    y: number;
    label: string;
    sublabel: string;
  };
  baselineCalving: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
  };
  modernCalving: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  lakePath: (ratio: number) => string;
  expansionPath: (ratio: number) => string | null;
  ruler: (ratio: number) => { x1: number; y1: number; x2: number; y2: number };
  glacierFlow: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
  };
}

const LAKE_GEOMETRIES: Record<string, LakeGeometryConfig> = {
  // 1. Galong Co / Cirenmaco (Bhote Koshi / Poiqu corridor)
  PDGL_NEP_KOSHI_007: {
    anchor: {
      x: 180,
      y: 195,
      label: '1981 BREACH NOTCH',
      sublabel: 'Western Moraine Scarp (4,380m)',
    },
    baselineCalving: {
      x1: 425,
      y1: 175,
      x2: 425,
      y2: 235,
      label: '2004 CALVING WALL',
    },
    modernCalving: {
      x1: 505,
      y1: 195,
      x2: 505,
      y2: 225,
    },
    lakePath: (t: number) => {
      const termX = 425 + t * (505 - 425);
      const termYTop = 175 + t * (195 - 175);
      const termYBot = 235 - t * (235 - 225);
      return `M 180,195 
        C 220,165 280,150 360,160 
        C 390,165 410,170 ${termX},${termYTop} 
        L ${termX},${termYBot} 
        C 410,238 360,245 300,242 
        C 240,238 200,220 180,195 Z`;
    },
    expansionPath: (t: number) => {
      if (t <= 0.02) return null;
      const termX = 425 + t * (505 - 425);
      const termYTop = 175 + t * (195 - 175);
      const termYBot = 235 - t * (235 - 225);
      return `M 425,175 L ${termX},${termYTop} L ${termX},${termYBot} L 425,235 Z`;
    },
    ruler: (t: number) => {
      const termX = 425 + t * (505 - 425);
      return { x1: 425, y1: 205, x2: termX, y2: 210 };
    },
    glacierFlow: {
      x1: 515,
      y1: 210,
      x2: 620,
      y2: 220,
      label: 'Galong Glacier Tongue ➔',
    },
  },

  // 2. Tsho Rolpa (Tama Koshi)
  PDGL_NEP_KOSHI_001: {
    anchor: {
      x: 235,
      y: 170,
      label: 'SPILLWAY SIPHON CANAL',
      sublabel: 'NW Terminal Moraine (4,580m)',
    },
    baselineCalving: {
      x1: 455,
      y1: 290,
      x2: 405,
      y2: 345,
      label: '2004 CALVING WALL',
    },
    modernCalving: {
      x1: 580,
      y1: 375,
      x2: 530,
      y2: 430,
    },
    lakePath: (t: number) => {
      const topX = 455 + t * (580 - 455);
      const topY = 290 + t * (375 - 290);
      const botX = 405 + t * (530 - 405);
      const botY = 345 + t * (430 - 345);
      return `M 235,170 
        C 275,145 350,195 410,240 
        L ${topX},${topY} 
        L ${botX},${botY} 
        C 350,300 290,260 250,210 
        C 240,195 235,180 235,170 Z`;
    },
    expansionPath: (t: number) => {
      if (t <= 0.02) return null;
      const topX = 455 + t * (580 - 455);
      const topY = 290 + t * (375 - 290);
      const botX = 405 + t * (530 - 405);
      const botY = 345 + t * (430 - 345);
      return `M 455,290 L ${topX},${topY} L ${botX},${botY} L 405,345 Z`;
    },
    ruler: (t: number) => {
      const topX = 455 + t * (580 - 455);
      const topY = 290 + t * (375 - 290);
      return { x1: 455, y1: 290, x2: topX, y2: topY };
    },
    glacierFlow: {
      x1: 580,
      y1: 400,
      x2: 670,
      y2: 430,
      label: 'Trakarding Glacier Tongue ➔',
    },
  },

  // 3. Imja Tsho (Everest / Dudh Koshi)
  PDGL_NEP_KOSHI_002: {
    anchor: {
      x: 185,
      y: 265,
      label: '2016 ENGINEERED CANAL',
      sublabel: 'West Outlet Spillway (5,010m)',
    },
    baselineCalving: {
      x1: 475,
      y1: 245,
      x2: 475,
      y2: 320,
      label: '2004 CALVING WALL',
    },
    modernCalving: {
      x1: 690,
      y1: 250,
      x2: 690,
      y2: 320,
    },
    lakePath: (t: number) => {
      const termX = 475 + t * (690 - 475);
      return `M 185,265 
        C 240,235 340,235 440,240 
        L ${termX},245 
        L ${termX},320 
        C 440,325 340,325 250,300 
        C 210,285 195,275 185,265 Z`;
    },
    expansionPath: (t: number) => {
      if (t <= 0.02) return null;
      const termX = 475 + t * (690 - 475);
      return `M 475,245 L ${termX},245 L ${termX},320 L 475,320 Z`;
    },
    ruler: (t: number) => {
      const termX = 475 + t * (690 - 475);
      return { x1: 475, y1: 285, x2: termX, y2: 285 };
    },
    glacierFlow: {
      x1: 700,
      y1: 285,
      x2: 780,
      y2: 285,
      label: 'Amphu / Lhotse Shar Cliffs ➔',
    },
  },

  // 4. Lower Barun Lake (Makalu-Barun / Arun)
  PDGL_NEP_KOSHI_003: {
    anchor: {
      x: 50,
      y: 230,
      label: 'TERMINAL MORAINE DAM',
      sublabel: 'Barun Gorge (4,540m)',
    },
    baselineCalving: {
      x1: 280,
      y1: 175,
      x2: 280,
      y2: 260,
      label: '2004 CALVING WALL',
    },
    modernCalving: {
      x1: 480,
      y1: 175,
      x2: 480,
      y2: 260,
    },
    lakePath: (t: number) => {
      const termX = 280 + t * (480 - 280);
      return `M 50,230 
        C 100,185 180,175 260,175 
        L ${termX},175 
        L ${termX},260 
        C 250,260 170,255 100,245 
        Z`;
    },
    expansionPath: (t: number) => {
      if (t <= 0.02) return null;
      const termX = 280 + t * (480 - 280);
      return `M 280,175 L ${termX},175 L ${termX},260 L 280,260 Z`;
    },
    ruler: (t: number) => {
      const termX = 280 + t * (480 - 280);
      return { x1: 280, y1: 218, x2: termX, y2: 218 };
    },
    glacierFlow: {
      x1: 490,
      y1: 215,
      x2: 580,
      y2: 215,
      label: 'Barun Glacier Tongue ➔',
    },
  },

  // 5. Birendra Lake (Manaslu / Budhi Gandaki)
  PDGL_NEP_GANDAKI_002: {
    anchor: {
      x: 440,
      y: 215,
      label: 'BUDHI GANDAKI OUTLET WEIR',
      sublabel: 'Manaslu Base (3,620m)',
    },
    baselineCalving: {
      x1: 462,
      y1: 195,
      x2: 450,
      y2: 215,
      label: '2004 BASIN',
    },
    modernCalving: {
      x1: 480,
      y1: 195,
      x2: 465,
      y2: 220,
    },
    lakePath: (t: number) => {
      const tipX = 462 + t * (480 - 462);
      return `M 440,215 
        C 445,200 455,188 ${tipX},195 
        L 465,220 
        C 455,220 445,218 440,215 Z`;
    },
    expansionPath: (t: number) => {
      if (t <= 0.02) return null;
      const tipX = 462 + t * (480 - 462);
      return `M 462,195 L ${tipX},195 L 465,220 L 450,215 Z`;
    },
    ruler: (t: number) => {
      const tipX = 462 + t * (480 - 462);
      return { x1: 462, y1: 205, x2: tipX, y2: 205 };
    },
    glacierFlow: {
      x1: 480,
      y1: 190,
      x2: 540,
      y2: 170,
      label: 'Manaslu Ice Chute ➔',
    },
  },

  // 6. South Lhonak (Sikkim / Teesta)
  PDGL_IND_SIKKIM_001: {
    anchor: {
      x: 400,
      y: 150,
      label: 'OCT 4 2023 BREACH CANYON',
      sublabel: 'Teesta Surge Notch (5,200m)',
    },
    baselineCalving: {
      x1: 240,
      y1: 165,
      x2: 240,
      y2: 235,
      label: '2004 CALVING',
    },
    modernCalving: {
      x1: 385,
      y1: 175,
      x2: 385,
      y2: 220,
    },
    lakePath: () => {
      return `M 400,150 
        C 350,160 260,165 160,165 
        L 50,180 
        L 50,230 
        C 160,245 260,235 350,195 
        Z`;
    },
    expansionPath: () => null,
    ruler: () => ({ x1: 240, y1: 200, x2: 385, y2: 200 }),
    glacierFlow: {
      x1: 100,
      y1: 200,
      x2: 40,
      y2: 200,
      label: 'South Lhonak Glacier ➔',
    },
  },

  // 7. Thulagi Lake (Marsyangdi)
  PDGL_NEP_GANDAKI_001: {
    anchor: {
      x: 580,
      y: 185,
      label: 'MARSYANGDI OUTLET WEIR',
      sublabel: 'Southern Moraine Lip (4,040m)',
    },
    baselineCalving: {
      x1: 505,
      y1: 100,
      x2: 505,
      y2: 160,
      label: '2004 CALVING',
    },
    modernCalving: {
      x1: 470,
      y1: 95,
      x2: 470,
      y2: 155,
    },
    lakePath: (t: number) => {
      const topX = 505 - t * (505 - 470);
      return `M 580,185 
        C 560,150 540,110 ${topX},95 
        L ${topX},155 
        C 530,170 560,180 580,185 Z`;
    },
    expansionPath: (t: number) => {
      if (t <= 0.02) return null;
      const topX = 505 - t * (505 - 470);
      return `M 505,100 L ${topX},95 L ${topX},155 L 505,160 Z`;
    },
    ruler: (t: number) => {
      const topX = 505 - t * (505 - 470);
      return { x1: 505, y1: 130, x2: topX, y2: 125 };
    },
    glacierFlow: {
      x1: 460,
      y1: 125,
      x2: 390,
      y2: 125,
      label: 'Dona Glacier Tongue ➔',
    },
  },
};

// Fallback dynamic geometry builder for arbitrary lakes
function getGenericGeometry(lakeName: string): LakeGeometryConfig {
  return {
    anchor: {
      x: 200,
      y: 225,
      label: 'TERMINAL MORAINE DAM',
      sublabel: `${lakeName} Outlet`,
    },
    baselineCalving: {
      x1: 440,
      y1: 175,
      x2: 440,
      y2: 275,
      label: '2004 CALVING',
    },
    modernCalving: {
      x1: 540,
      y1: 170,
      x2: 540,
      y2: 280,
    },
    lakePath: (t: number) => {
      const termX = 440 + t * (540 - 440);
      return `M 200,225 
        C 240,195 320,180 400,178 
        L ${termX},172 
        L ${termX},278 
        C 400,270 320,260 240,250 
        Z`;
    },
    expansionPath: (t: number) => {
      if (t <= 0.02) return null;
      const termX = 440 + t * (540 - 440);
      return `M 440,175 L ${termX},172 L ${termX},278 L 440,275 Z`;
    },
    ruler: (t: number) => {
      const termX = 440 + t * (540 - 440);
      return { x1: 440, y1: 225, x2: termX, y2: 225 };
    },
    glacierFlow: {
      x1: 540,
      y1: 225,
      x2: 640,
      y2: 225,
      label: 'Glacier Tongue ➔',
    },
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const LakeComparisonModal: React.FC<LakeComparisonModalProps> = ({
  lakeId,
  lakeName,
  icimodCode,
  isOpen,
  onClose,
}) => {
  const [activeLakeCode, setActiveLakeCode] = useState<string>(icimodCode || lakeId || 'PDGL_NEP_KOSHI_007');
  const [data, setData] = useState<ComparisonData | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50); // Split swipe slider (0 to 100%)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Dual Mode: 'ortho' (calibrated photorealistic model) | 'raw' (Copernicus/Landsat multi-spectral feeds)
  const [imageryMode, setImageryMode] = useState<'ortho' | 'raw'>('ortho');
  // Vector Overlay Opacity (0% to 100%)
  const [overlayOpacity, setOverlayOpacity] = useState<number>(60);
  const [showAnchor, setShowAnchor] = useState<boolean>(true);

  // Interactive GIS Zoom (1x to 4x) & Pan
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)));
  const handleZoomOut = () => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom((z) => Math.min(4, Math.max(1, +(z + delta).toFixed(2))));
  };

  // Multi-spectral band filter: 'rgb' (natural) | 'nir' (false-color infrared NDWI) | 'sar' (high-contrast terrain)
  const [spectralBand, setSpectralBand] = useState<'rgb' | 'nir' | 'sar'>('rgb');

  // Inspection Display Mode: 'side-by-side' | 'split'
  const [viewMode, setViewMode] = useState<'side-by-side' | 'split'>('side-by-side');
  const [showExpansionHighlight, setShowExpansionHighlight] = useState<boolean>(true);
  const [showCalvingLine, setShowCalvingLine] = useState<boolean>(true);

  // Sync active lake when props change or modal opens
  useEffect(() => {
    if (isOpen) {
      const target = icimodCode || lakeId || 'PDGL_NEP_KOSHI_007';
      setActiveLakeCode(target);
      setSelectedYear(2026);
      setIsPlaying(false);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, icimodCode, lakeId]);

  // Dynamic preset pills
  const displayedPresets = useMemo(() => {
    const activeExists = TIMELAPSE_PRESET_LAKES.some(
      (p) =>
        p.code.toLowerCase() === activeLakeCode.toLowerCase() ||
        (data && p.code.toLowerCase() === data.icimod_code.toLowerCase())
    );
    if (!activeExists && (data || lakeName)) {
      const customPreset: TimelapsePresetLake = {
        code: data?.icimod_code || activeLakeCode,
        name: data?.lake_name || lakeName || 'Active Target',
        basin: data?.basin || 'Monitored Basin',
        region: 'Himalayan Arc',
        elevation: data?.elevation_m ? `${data.elevation_m}m` : 'Alpine',
        tag: 'Inspected Target',
      };
      return [customPreset, ...TIMELAPSE_PRESET_LAKES];
    }
    return TIMELAPSE_PRESET_LAKES;
  }, [activeLakeCode, data, lakeName]);

  // Fetch comparison data for current active lake
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/lakes/${activeLakeCode}/timelapse-comparison`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setSelectedYear(2026);
        }
      } catch (err) {
        console.error('Failed to fetch timelapse data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, activeLakeCode]);

  // Automated playback through consecutive years (2004 to 2026)
  useEffect(() => {
    if (!isPlaying || !data || data.epochs.length === 0) return;

    const intervalTime = Math.max(350, 1200 / playbackSpeed);
    const timer = setInterval(() => {
      setSelectedYear((prevYear) => {
        if (prevYear >= 2026) {
          return 2004;
        }
        return prevYear + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, data, playbackSpeed]);

  const baselineEpoch = useMemo(() => {
    return data?.epochs.find((e) => e.epoch_year === 2004) || data?.epochs[0] || null;
  }, [data]);

  const currentEpoch = useMemo(() => {
    return data?.epochs.find((e) => e.epoch_year === selectedYear) || data?.epochs[data.epochs.length - 1] || null;
  }, [data, selectedYear]);

  // Sparkline Points
  const { sparklinePoints, activePointCoord } = useMemo(() => {
    if (!data || data.epochs.length === 0) {
      return { sparklinePoints: '', activePointCoord: { x: 0, y: 0 } };
    }
    const areas = data.epochs.map((e) => e.area_sqkm);
    const rawMin = Math.min(...areas);
    const rawMax = Math.max(...areas);
    const span = Math.max(0.04, rawMax - rawMin);
    const min = Math.max(0, rawMin - span * 0.1);
    const max = rawMax + span * 0.1;
    const w = 500;
    const h = 50;

    const points = data.epochs
      .map((ep, idx) => {
        const x = (idx / (data.epochs.length - 1)) * w;
        const y = h - ((ep.area_sqkm - min) / (max - min)) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    let activeCoord = { x: 0, y: 0 };
    if (currentEpoch) {
      const idx = data.epochs.findIndex((e) => e.epoch_year === currentEpoch.epoch_year);
      if (idx !== -1) {
        const x = (idx / (data.epochs.length - 1)) * w;
        const y = h - ((currentEpoch.area_sqkm - min) / (max - min)) * h;
        activeCoord = { x, y };
      }
    }

    return { sparklinePoints: points, activePointCoord: activeCoord };
  }, [data, currentEpoch]);

  const landmarkYears = [2004, 2007, 2011, 2015, 2018, 2021, 2023, 2026];

  // Geometric retreat ratio (0.0 for 2004 -> 1.0 for max retreat in 2026)
  const retreatRatio = useMemo(() => {
    if (!currentEpoch || !data) return 1.0;
    const maxRetreat = Math.max(100, data.net_summary?.total_glacier_terminus_retreat_m || 680);
    return Math.min(1.0, Math.max(0.0, currentEpoch.terminus_retreat_m / maxRetreat));
  }, [currentEpoch, data]);

  // Current Lake Geometry
  const activeGeometry = useMemo<LakeGeometryConfig>(() => {
    const code = data?.icimod_code || activeLakeCode;
    return LAKE_GEOMETRIES[code] || getGenericGeometry(data?.lake_name || lakeName);
  }, [data, activeLakeCode, lakeName]);

  if (!isOpen) return null;

  const initialAreaSqm = data?.net_summary?.initial_area_sqm_2004 || 1380000;
  const initialAreaSqkm = (initialAreaSqm / 1e6).toFixed(3);
  const currentAreaSqm = currentEpoch?.area_sqm || 0;
  const deltaSqm = currentAreaSqm - initialAreaSqm;
  const isSouthLhonakBreach = (data?.icimod_code === 'PDGL_IND_SIKKIM_001') && selectedYear >= 2023;

  // Render SVG Vector Lake Overlay with Geodesic Alignment
  const renderLakeSvg = (is2004Baseline: boolean) => {
    const effectiveRatio = is2004Baseline ? 0.0 : retreatRatio;
    const lakePathD = activeGeometry.lakePath(effectiveRatio);
    const expansionPathD = activeGeometry.expansionPath(effectiveRatio);
    const { anchor, baselineCalving, modernCalving, glacierFlow } = activeGeometry;

    // Active calving line coordinates (interpolated along retreat axis)
    const activeCalving = {
      x1: baselineCalving.x1 + effectiveRatio * (modernCalving.x1 - baselineCalving.x1),
      y1: baselineCalving.y1 + effectiveRatio * (modernCalving.y1 - baselineCalving.y1),
      x2: baselineCalving.x2 + effectiveRatio * (modernCalving.x2 - baselineCalving.x2),
      y2: baselineCalving.y2 + effectiveRatio * (modernCalving.y2 - baselineCalving.y2),
    };

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none transition-opacity duration-200"
        viewBox="0 0 800 450"
        preserveAspectRatio="none"
        style={{ opacity: overlayOpacity / 100 }}
      >
        <defs>
          {/* Glacial Water Gradient 2004 (Landsat 7 False Color NIR Navy) */}
          <linearGradient id="waterGrad2004" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0284C7" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#0369A1" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#075985" stopOpacity="0.65" />
          </linearGradient>

          {/* Glacial Water Gradient Modern (Sentinel-2 True Color Milky Turquoise) */}
          <linearGradient id="waterGradModern" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#0891B2" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0E7490" stopOpacity="0.65" />
          </linearGradient>

          {/* Post-Breach Drained Lake Water Gradient (South Lhonak) */}
          <linearGradient id="waterGradBreached" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7F1D1D" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#991B1B" stopOpacity="0.75" />
          </linearGradient>

          {/* Expansion Zone Striped Pattern */}
          <pattern id="expansionHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#F43F5E" strokeWidth="2.5" strokeOpacity="0.75" />
          </pattern>
        </defs>

        {/* 1. Precision Lake Shoreline Perimeter & Water Body */}
        <path
          d={lakePathD}
          fill={
            isSouthLhonakBreach && !is2004Baseline
              ? 'url(#waterGradBreached)'
              : is2004Baseline
              ? 'url(#waterGrad2004)'
              : 'url(#waterGradModern)'
          }
          stroke={isSouthLhonakBreach && !is2004Baseline ? '#EF4444' : is2004Baseline ? '#38BDF8' : '#22D3EE'}
          strokeWidth="2.5"
          filter="drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))"
        />

        {/* 2. New Meltwater Expansion Zone Highlight */}
        {!is2004Baseline && showExpansionHighlight && expansionPathD && !isSouthLhonakBreach && (
          <g>
            <path
              d={expansionPathD}
              fill="url(#expansionHatch)"
              stroke="#FB7185"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            <path
              d={expansionPathD}
              fill="#F43F5E"
              fillOpacity="0.25"
            />
          </g>
        )}

        {/* 3. Upstream Glacier Flow Indicator */}
        <g opacity="0.85">
          <line
            x1={glacierFlow.x1}
            y1={glacierFlow.y1}
            x2={glacierFlow.x2}
            y2={glacierFlow.y2}
            stroke="#94A3B8"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <text
            x={(glacierFlow.x1 + glacierFlow.x2) / 2}
            y={glacierFlow.y1 - 8}
            fill="#E2E8F0"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            filter="drop-shadow(0 1px 3px rgba(0,0,0,0.9))"
          >
            {glacierFlow.label}
          </text>
        </g>

        {/* 4. 2004 Baseline Calving Front Reference Wall */}
        {(!is2004Baseline || viewMode === 'split') && (
          <g>
            <line
              x1={baselineCalving.x1}
              y1={baselineCalving.y1}
              x2={baselineCalving.x2}
              y2={baselineCalving.y2}
              stroke="#FACC15"
              strokeWidth="2.5"
              strokeDasharray="4 3"
              filter="drop-shadow(0 0 3px rgba(250, 204, 21, 0.8))"
            />
            <text
              x={(baselineCalving.x1 + baselineCalving.x2) / 2}
              y={Math.min(baselineCalving.y1, baselineCalving.y2) - 8}
              fill="#FDE047"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              filter="drop-shadow(0 1px 3px rgba(0,0,0,0.9))"
            >
              2004 CALVING WALL (0m)
            </text>
          </g>
        )}

        {/* 5. Active Retreated Calving Front Cliff Line & Distance Ruler */}
        {showCalvingLine && (
          <g>
            <line
              x1={activeCalving.x1}
              y1={activeCalving.y1}
              x2={activeCalving.x2}
              y2={activeCalving.y2}
              stroke={isSouthLhonakBreach && !is2004Baseline ? '#EF4444' : '#F43F5E'}
              strokeWidth="3.5"
              filter="drop-shadow(0 0 5px rgba(244, 63, 94, 0.9))"
            />
            <rect
              x={(activeCalving.x1 + activeCalving.x2) / 2 - 42}
              y={Math.max(activeCalving.y1, activeCalving.y2) + 6}
              width="84"
              height="18"
              rx="4"
              fill="#0F172A"
              fillOpacity="0.95"
              stroke={isSouthLhonakBreach && !is2004Baseline ? '#EF4444' : '#F43F5E'}
              strokeWidth="1"
            />
            <text
              x={(activeCalving.x1 + activeCalving.x2) / 2}
              y={Math.max(activeCalving.y1, activeCalving.y2) + 18}
              fill="#FDA4AF"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
            >
              {is2004Baseline ? '2004 FRONT' : `-${currentEpoch?.terminus_retreat_m}m RETREAT`}
            </text>

            {/* Geodesic Retreat Ruler between 2004 Baseline and Current Front */}
            {!is2004Baseline && effectiveRatio > 0.08 && (
              <g>
                <line
                  x1={(baselineCalving.x1 + baselineCalving.x2) / 2}
                  y1={(baselineCalving.y1 + baselineCalving.y2) / 2}
                  x2={(activeCalving.x1 + activeCalving.x2) / 2}
                  y2={(activeCalving.y1 + activeCalving.y2) / 2}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />
                <circle cx={(baselineCalving.x1 + baselineCalving.x2) / 2} cy={(baselineCalving.y1 + baselineCalving.y2) / 2} r="3" fill="#FACC15" />
                <circle cx={(activeCalving.x1 + activeCalving.x2) / 2} cy={(activeCalving.y1 + activeCalving.y2) / 2} r="3" fill="#F43F5E" />
              </g>
            )}
          </g>
        )}

        {/* 6. Geographically Calibrated Anchor Pin & Crosshair (Smart, Compact Alignment) */}
        {showAnchor && (
          <g>
            {/* Target Ring */}
            <circle cx={anchor.x} cy={anchor.y} r="12" fill="none" stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.9" />
            <circle cx={anchor.x} cy={anchor.y} r="5" fill="#F59E0B" fillOpacity="0.4" stroke="#F59E0B" strokeWidth="1.8" />
            <circle cx={anchor.x} cy={anchor.y} r="2" fill="#FFFFFF" />

            {/* Smart Leader Line */}
            <line
              x1={anchor.x}
              y1={anchor.y}
              x2={anchor.x < 300 ? anchor.x + 22 : anchor.x - 22}
              y2={anchor.y < 200 ? anchor.y - 20 : anchor.y + 20}
              stroke="#F59E0B"
              strokeWidth="1.2"
            />

            {/* Smart Compact Badge */}
            <rect
              x={anchor.x < 300 ? anchor.x + 22 : anchor.x - 142}
              y={anchor.y < 200 ? anchor.y - 34 : anchor.y + 10}
              width="120"
              height="26"
              rx="4"
              fill="#020617"
              fillOpacity="0.94"
              stroke="#F59E0B"
              strokeWidth="1"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
            />
            <text
              x={anchor.x < 300 ? anchor.x + 82 : anchor.x - 82}
              y={anchor.y < 200 ? anchor.y - 22 : anchor.y + 22}
              fill="#FDE047"
              fontSize="8"
              fontWeight="bold"
              textAnchor="middle"
            >
              ⚓ {anchor.label}
            </text>
            <text
              x={anchor.x < 300 ? anchor.x + 82 : anchor.x - 82}
              y={anchor.y < 200 ? anchor.y - 12 : anchor.y + 32}
              fill="#94A3B8"
              fontSize="6.5"
              textAnchor="middle"
            >
              {anchor.sublabel}
            </text>
          </g>
        )}
      </svg>
    );
  };

  const getChipUrl = (year: number) => {
    if (imageryMode === 'raw') {
      if (data?.bbox) {
        const [minLon, minLat, maxLon, maxLat] = data.bbox;
        if (year >= 2018 && year <= 2025) {
          return `https://tiles.maps.eox.at/wms?service=wms&request=GetMap&version=1.1.1&layers=s2cloudless-${year}&styles=&format=image/jpeg&srs=EPSG:4326&bbox=${minLon},${minLat},${maxLon},${maxLat}&width=800&height=450`;
        }
        return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${minLon},${minLat},${maxLon},${maxLat}&bboxSR=4326&imageSR=4326&size=800,450&f=image`;
      }
    }
    const code = data?.icimod_code || activeLakeCode;
    return `/imagery/timelapse/${code}/${year}.jpg?v=20260905_v3`;
  };

  const currentChipUrl = getChipUrl(selectedYear);
  const baselineChipUrl = getChipUrl(2004);

  // Shader class based on spectral band & sensor
  const getFilterClass = (is2004Baseline: boolean) => {
    if (spectralBand === 'nir') {
      return 'contrast-135 saturate-200 brightness-95 hue-rotate-[-20deg]';
    }
    if (spectralBand === 'sar') {
      return 'contrast-160 brightness-90 grayscale';
    }
    // Natural True Color
    return is2004Baseline
      ? 'contrast-115 brightness-95 saturate-105'
      : 'contrast-110 brightness-102';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh] max-h-[920px]">
        {/* 1. Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                  {data?.lake_name || lakeName} • 20-Year Retrospective Glacial Calving & Expansion
                </h3>
                <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold">
                  2004 — 2026 (23 Consecutive Years)
                </span>
                {data?.elevation_m && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    Elev: {data.elevation_m}m
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Multispectral Landsat 7/8 & Copernicus Sentinel-2 calibrated calving margin analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dual Imagery Mode Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setImageryMode('ortho')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                  imageryMode === 'ortho'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Seamless High-Resolution Ortho Calving Model (2004–2026)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">High-Res Ortho</span>
              </button>
              <button
                onClick={() => setImageryMode('raw')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                  imageryMode === 'raw'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Raw Space Agency Sentinel-2 / Landsat Multi-Spectral Feeds"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Raw Space Feeds</span>
              </button>
            </div>

            {/* View Mode Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                  viewMode === 'side-by-side'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Side-by-Side Comparison"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Side-by-Side</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('split');
                  setSliderPos(50);
                }}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                  viewMode === 'split'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Curtain Swipe Slider"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Swipe Curtain</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Lake Preset Switcher Bar (Pan-Himalayan Scope) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 px-5 pt-2.5 bg-slate-900/60 border-b border-slate-800/80 custom-scrollbar shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Glacial Lake Presets:
          </span>
          {displayedPresets.map((l) => {
            const isActive = (data?.icimod_code === l.code) || (activeLakeCode === l.code);
            return (
              <button
                key={l.code}
                onClick={() => {
                  setActiveLakeCode(l.code);
                  setSelectedYear(2026);
                  setIsPlaying(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-lg shadow-cyan-950 ring-1 ring-cyan-400/40'
                    : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="font-bold">{l.name}</span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">({l.basin})</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    l.isBreached
                      ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
                      : isActive
                      ? 'bg-cyan-950 text-cyan-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {l.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. Scrollable Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 font-mono custom-scrollbar">
          {/* Overlay Feature Toggles, Spectral Bands & Active State */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showExpansionHighlight}
                  onChange={(e) => setShowExpansionHighlight(e.target.checked)}
                  className="rounded accent-rose-500"
                />
                <span className="text-[11px] text-rose-300 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-rose-400" />
                  Highlight Meltwater Expansion ({data?.net_summary?.net_expansion_sqm ? (data.net_summary.net_expansion_sqm > 0 ? '+' : '') + data.net_summary.net_expansion_sqm.toLocaleString() + ' m²' : '+260,000 m²'})
                </span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCalvingLine}
                  onChange={(e) => setShowCalvingLine(e.target.checked)}
                  className="rounded accent-cyan-500"
                />
                <span className="text-[11px] text-cyan-300 font-semibold flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-cyan-400" />
                  Calving Front Line
                </span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAnchor}
                  onChange={(e) => setShowAnchor(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span className="text-[11px] text-amber-300 font-semibold">
                  Geo-Anchors
                </span>
              </label>

              {/* Vector Overlay Opacity Slider */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] text-slate-400 font-semibold">Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  aria-label="Vector Overlay Opacity"
                  className="w-16 sm:w-20 h-1.5 accent-cyan-400 bg-slate-800 rounded appearance-none cursor-pointer"
                />
                <span className="text-[10px] text-cyan-300 font-bold w-7 text-right">{overlayOpacity}%</span>
              </div>

              {/* Spectral Band Selector */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px]">
                <span className="text-slate-500 px-1.5 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-slate-400" />
                  Band:
                </span>
                <button
                  onClick={() => setSpectralBand('rgb')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    spectralBand === 'rgb' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Natural RGB true color satellite photography"
                >
                  RGB True Color
                </button>
                <button
                  onClick={() => setSpectralBand('nir')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    spectralBand === 'nir' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="False-color infrared water detection (NDWI)"
                >
                  NIR / NDWI Water
                </button>
                <button
                  onClick={() => setSpectralBand('sar')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    spectralBand === 'sar' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="High-contrast radar / moraine crest morphology"
                >
                  Moraine SAR
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              Active Display: <strong className="text-white">2004 Baseline ({initialAreaSqkm} km²)</strong> vs <strong className="text-cyan-400">Year {selectedYear} ({currentEpoch?.area_sqkm.toFixed(3)} km²)</strong>
            </div>
          </div>

          {/* MAIN VISUALIZATION CONTAINER */}
          {viewMode === 'side-by-side' ? (
            /* SIDE-BY-SIDE MODE */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Left Pane: 2004 Baseline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    2004 Baseline (Landsat 7 ETM+ • 30m GSD)
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {initialAreaSqkm} km² • 0 m Retreat
                  </span>
                </div>
                <div
                  className={`relative w-full h-[280px] sm:h-[330px] rounded-xl overflow-hidden border border-amber-500/40 bg-slate-950 shadow-inner select-none ${
                    zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                  }`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  <div
                    className="absolute inset-0 w-full h-full transition-transform duration-75 origin-center"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    }}
                  >
                    <img
                      key={baselineChipUrl}
                      src={baselineChipUrl}
                      alt="2004 Satellite View"
                      onError={(e) => {
                        if (data?.bbox) {
                          const [minLon, minLat, maxLon, maxLat] = data.bbox;
                          (e.target as HTMLImageElement).src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${minLon},${minLat},${maxLon},${maxLat}&bboxSR=4326&imageSR=4326&size=800,450&f=image`;
                        }
                      }}
                      className={`w-full h-full object-cover transition-all duration-300 ${getFilterClass(true)}`}
                    />
                    {renderLakeSvg(true)}
                  </div>

                  {/* Floating GIS Controls (Zoom & Pan) */}
                  <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-xl">
                    <button
                      onClick={handleZoomIn}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 transition-colors"
                      title="Zoom In (+)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      disabled={zoom <= 1}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Zoom Out (-)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleResetView}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-cyan-400 transition-colors"
                      title="Reset Zoom & Pan (1x)"
                    >
                      {zoom.toFixed(1)}x
                    </button>
                    {zoom > 1 && (
                      <span className="text-[9px] font-mono text-slate-400 px-1 border-l border-slate-800 hidden sm:inline">
                        Drag to Pan
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur px-2.5 py-1 rounded border border-amber-500/50 text-[10px] text-amber-300 font-bold z-10">
                    2004 • Baseline Anchor ({initialAreaSqkm} km²)
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 bg-slate-950/90 backdrop-blur px-2.5 py-1 rounded border border-slate-800 text-[10px] text-slate-300 z-10">
                    Terminus: {data?.glacier_name || 'Glacier Tongue'} at 0 m baseline
                  </div>
                </div>
              </div>

              {/* Right Pane: Selected Year (Dynamic Evolution) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    Year {selectedYear} ({currentEpoch?.sensor || 'Copernicus Sentinel-2'})
                  </span>
                  <span className="font-mono font-bold text-rose-300">
                    {currentEpoch?.area_sqkm.toFixed(3)} km² ({currentEpoch?.delta_area_pct && currentEpoch.delta_area_pct > 0 ? `+${currentEpoch.delta_area_pct}%` : `${currentEpoch?.delta_area_pct || 0}%`})
                  </span>
                </div>
                <div
                  className={`relative w-full h-[280px] sm:h-[330px] rounded-xl overflow-hidden border border-cyan-500/40 bg-slate-950 shadow-inner ring-1 ring-cyan-500/20 select-none ${
                    zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                  }`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  <div
                    className="absolute inset-0 w-full h-full transition-transform duration-75 origin-center"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    }}
                  >
                    <img
                      key={currentChipUrl}
                      src={currentChipUrl}
                      alt={`${selectedYear} Satellite View`}
                      onError={(e) => {
                        if (data?.bbox) {
                          const [minLon, minLat, maxLon, maxLat] = data.bbox;
                          (e.target as HTMLImageElement).src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${minLon},${minLat},${maxLon},${maxLat}&bboxSR=4326&imageSR=4326&size=800,450&f=image`;
                        }
                      }}
                      className={`w-full h-full object-cover transition-all duration-300 ${getFilterClass(false)}`}
                    />
                    {renderLakeSvg(false)}
                  </div>

                  {/* Floating GIS Controls (Zoom & Pan) */}
                  <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-xl">
                    <button
                      onClick={handleZoomIn}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 transition-colors"
                      title="Zoom In (+)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      disabled={zoom <= 1}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Zoom Out (-)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleResetView}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-cyan-400 transition-colors"
                      title="Reset Zoom & Pan (1x)"
                    >
                      {zoom.toFixed(1)}x
                    </button>
                    {zoom > 1 && (
                      <span className="text-[9px] font-mono text-slate-400 px-1 border-l border-slate-800 hidden sm:inline">
                        Drag to Pan
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur px-2.5 py-1 rounded border border-cyan-500/50 text-[10px] text-cyan-300 font-bold z-10">
                    {selectedYear} • Retreated -{currentEpoch?.terminus_retreat_m} m
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 bg-slate-950/90 backdrop-blur px-2.5 py-1 rounded border border-slate-800 text-[10px] text-slate-200 z-10">
                    {deltaSqm >= 0 ? (
                      <span className="text-rose-300">New Meltwater: +{currentEpoch?.delta_area_pct}% (+{deltaSqm.toLocaleString()} m²)</span>
                    ) : (
                      <span className="text-amber-400 font-bold">Post-Breach Drainage: {currentEpoch?.delta_area_pct}% ({deltaSqm.toLocaleString()} m²)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SWIPE CURTAIN / SPLIT MODE */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-amber-400 font-bold">
                  ◀ 2004 Baseline ({initialAreaSqkm} km²)
                </span>
                <span className="text-slate-500 text-[10px]">
                  Drag the center slider (↔) left or right to peel between 2004 and {selectedYear}
                </span>
                <span className="text-cyan-400 font-bold">
                  Year {selectedYear} ({currentEpoch?.area_sqkm.toFixed(3)} km² • -{currentEpoch?.terminus_retreat_m}m) ▶
                </span>
              </div>

              <div
                className={`relative w-full h-[300px] sm:h-[350px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 select-none shadow-inner group ${
                  zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                {/* Background Layer: Selected Year */}
                <div
                  className="absolute inset-0 w-full h-full transition-transform duration-75 origin-center"
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  }}
                >
                  <img
                    key={`split-cur-${currentChipUrl}`}
                    src={currentChipUrl}
                    alt="Modern satellite layer"
                    onError={(e) => {
                      if (data?.bbox) {
                        const [minLon, minLat, maxLon, maxLat] = data.bbox;
                        (e.target as HTMLImageElement).src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${minLon},${minLat},${maxLon},${maxLat}&bboxSR=4326&imageSR=4326&size=800,450&f=image`;
                      }
                    }}
                    className={`w-full h-full object-cover transition-all duration-300 ${getFilterClass(false)}`}
                  />
                  {renderLakeSvg(false)}
                </div>
                <div className="absolute top-3 right-3 mr-24 bg-black/85 backdrop-blur px-2.5 py-1 rounded border border-cyan-500/50 text-[11px] text-cyan-300 font-bold z-10">
                  {selectedYear} • {currentEpoch?.area_sqkm.toFixed(3)} km² (-{currentEpoch?.terminus_retreat_m}m)
                </div>

                {/* Foreground Layer: 2004 Baseline (Clipped by sliderPos) */}
                <div
                  className="absolute inset-0 overflow-hidden border-r-2 border-cyan-400 shadow-2xl z-10"
                  style={{ width: `${sliderPos}%` }}
                >
                  <div
                    className="absolute inset-0 w-full h-full min-w-[800px] transition-transform duration-75 origin-center"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    }}
                  >
                    <img
                      key={`split-base-${baselineChipUrl}`}
                      src={baselineChipUrl}
                      alt="2004 baseline satellite layer"
                      onError={(e) => {
                        if (data?.bbox) {
                          const [minLon, minLat, maxLon, maxLat] = data.bbox;
                          (e.target as HTMLImageElement).src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${minLon},${minLat},${maxLon},${maxLat}&bboxSR=4326&imageSR=4326&size=800,450&f=image`;
                        }
                      }}
                      className={`w-full h-full object-cover transition-all duration-300 ${getFilterClass(true)}`}
                    />
                    {renderLakeSvg(true)}
                  </div>
                  <div className="absolute top-3 left-3 bg-black/85 backdrop-blur px-2.5 py-1 rounded border border-amber-500/50 text-[11px] text-amber-300 font-bold z-10">
                    2004 Baseline • {initialAreaSqkm} km²
                  </div>
                </div>

                {/* Floating GIS Controls (Zoom & Pan) */}
                <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-xl">
                  <button
                    onClick={handleZoomIn}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 transition-colors"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                    className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetView}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-cyan-400 transition-colors"
                    title="Reset Zoom & Pan (1x)"
                  >
                    {zoom.toFixed(1)}x
                  </button>
                  {zoom > 1 && (
                    <span className="text-[9px] font-mono text-slate-400 px-1 border-l border-slate-800 hidden sm:inline">
                      Drag to Pan
                    </span>
                  )}
                </div>

                {/* Draggable Divider Handle */}
                <div
                  className="absolute top-0 bottom-0 z-20 flex items-center justify-center pointer-events-none"
                  style={{ left: `calc(${sliderPos}% - 14px)` }}
                >
                  <div className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center shadow-2xl border-2 border-white text-xs">
                    ↔
                  </div>
                </div>

                {/* Range Input */}
                {zoom === 1 && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    aria-label="Swipe curtain divider"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                  />
                )}

                <div className="absolute bottom-2.5 left-2.5 z-10 bg-slate-950/85 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-200">
                  {zoom > 1 ? 'Zoomed View • Drag to pan viewport' : 'Drag divider across valley to peel between 2004 baseline and current calving terminus'}
                </div>
              </div>
            </div>
          )}

          {/* 4. ANNUAL TIMELINE SCRUBBER (2004 — 2026) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Annual Timeline Scrubber (2004 — 2026)
                </span>
                <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-500/40">
                  Year {selectedYear}
                </span>
                {isSouthLhonakBreach && (
                  <span className="text-xs font-bold text-rose-300 bg-rose-950/90 px-2.5 py-0.5 rounded border border-rose-500/60 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    POST-OCTOBER 2023 GLOF BREACH STATE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedYear((y) => Math.max(2004, y - 1))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  title="Previous Year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs flex items-center gap-1 font-bold shadow transition-colors"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? 'Pause' : 'Play (2004-2026)'}
                </button>
                <button
                  onClick={() => setSelectedYear((y) => Math.min(2026, y + 1))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  title="Next Year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedYear(2004);
                    setIsPlaying(false);
                  }}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
                  title="Reset to 2004"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Range Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="2004"
                max="2026"
                step="1"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setIsPlaying(false);
                }}
                aria-label="Annual timeline year slider"
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
                <span>2004 (Baseline)</span>
                <span>2008</span>
                <span>2012</span>
                <span>2015 (Gorkha Eq)</span>
                <span>2020</span>
                <span>2023 (Sikkim Breach)</span>
                <span className="text-cyan-400 font-bold">2026 (Present)</span>
              </div>
            </div>

            {/* Horizontal Scrollable Yearly Epoch Chips (23 Years) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar pt-1">
              {data?.epochs.map((ep) => {
                const isSelected = selectedYear === ep.epoch_year;
                const isLandmark = landmarkYears.includes(ep.epoch_year);

                return (
                  <button
                    key={ep.epoch_year}
                    onClick={() => {
                      setSelectedYear(ep.epoch_year);
                      setIsPlaying(false);
                    }}
                    className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-mono border transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-bold border-white shadow-lg ring-1 ring-cyan-400'
                        : isLandmark
                        ? 'bg-slate-800/90 text-cyan-300 border-cyan-500/30 hover:bg-slate-700'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {ep.epoch_year}
                  </button>
                );
              })}
            </div>

            {/* Selected Year Detailed Glaciological Metric Box */}
            {currentEpoch && (
              <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Sensor & Capture Date:</span>
                  <span className="font-bold text-cyan-300 text-[11px] block truncate">
                    {currentEpoch.sensor}
                  </span>
                  <span className="text-slate-400 text-[10px]">{currentEpoch.capture_date} ({currentEpoch.resolution_m}m)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Area Expansion / Delta:</span>
                  <span className="font-bold text-white text-[11px]">
                    {currentEpoch.area_sqkm.toFixed(3)} km²
                  </span>
                  <span className="text-rose-400 text-[10px] block font-semibold">
                    {currentEpoch.delta_area_pct > 0
                      ? `+${currentEpoch.delta_area_pct}% (+${deltaSqm.toLocaleString()} m²)`
                      : currentEpoch.delta_area_pct < 0
                      ? `${currentEpoch.delta_area_pct}% (${deltaSqm.toLocaleString()} m²)`
                      : 'Baseline Anchor (0 m²)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Terminus Retreat & Volume:</span>
                  <span className="font-bold text-amber-300 text-[11px]">
                    -{currentEpoch.terminus_retreat_m} meters
                  </span>
                  <span className="text-blue-300 text-[10px] block">{currentEpoch.estimated_volume_million_m3} Million m³ water</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Glaciological Milestone:</span>
                  <span className="text-slate-300 text-[10px] leading-tight block">
                    {currentEpoch.glaciological_note}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Dynamic 23-Year Expansion Curve Sparkline Chart */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs flex-wrap gap-1">
              <span className="text-white font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                23-Year Surface Growth Curve ({initialAreaSqkm} km² ➔ {((data?.net_summary?.current_area_sqm_2026 || currentAreaSqm) / 1e6).toFixed(3)} km²)
              </span>
              <span className="text-[10px] text-slate-400">
                Rate: +{(data?.net_summary?.annual_expansion_rate_sqm_year || 0).toLocaleString()} m²/yr • Net Volume Delta: {data?.net_summary?.net_volume_added_million_m3 && data.net_summary.net_volume_added_million_m3 > 0 ? `+${data.net_summary.net_volume_added_million_m3}` : `${data?.net_summary?.net_volume_added_million_m3 || 0}`}M m³
              </span>
            </div>

            {/* SVG Sparkline */}
            <div className="relative w-full h-12 bg-slate-950/60 rounded-lg p-1.5 border border-slate-800/80 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 500 50" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,50 ${sparklinePoints} 500,50`}
                  fill="url(#areaGrad)"
                />
                <polyline
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="2"
                  points={sparklinePoints}
                />
                {activePointCoord.x > 0 && (
                  <g>
                    <line
                      x1={activePointCoord.x}
                      y1="0"
                      x2={activePointCoord.x}
                      y2="50"
                      stroke="#F43F5E"
                      strokeDasharray="2 2"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={activePointCoord.x}
                      cy={activePointCoord.y}
                      r="4"
                      fill="#F43F5E"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* 6. Modal Footer */}
        <div className="px-6 py-2.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0 flex-wrap gap-2">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Landsat 7/8 (15-30m) & Copernicus Sentinel-2 MSI (10m) Multi-Spectral Calibrated Feed • Drivers: {data?.net_summary?.primary_driver || 'Climate warming'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
