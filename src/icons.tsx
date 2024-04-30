
type Opts = {
    width?: number;
    height?: number;
    mirror?: true;
  } & React.SVGProps<SVGSVGElement>;

  const modifiedTablerIconProps: Opts = {
    width: 20,
    height: 20,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;


export const createIcon = (
    d: string | React.ReactNode,
    opts: number | Opts = 512,
  ) => {
    const {
      width = 512,
      height = width,
      mirror,
      style,
      ...rest
    } = typeof opts === "number" ? ({ width: opts } as Opts) : opts;
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        style={style}
        {...rest}
      >
        {typeof d === "string" ? <path fill="currentColor" d={d} /> : d}
      </svg>
    );
  };

const tablerIconProps: Opts = {
    width: 24,
    height: 24,
    fill: "none",
    strokeWidth: 2,
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
} as const;


export const HamburgerMenuIcon = createIcon(
    <g strokeWidth="1.5">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <line x1="4" y1="6" x2="20" y2="6"></line>
      <line x1="4" y1="12" x2="20" y2="12"></line>
      <line x1="4" y1="18" x2="20" y2="18"></line>
    </g>,
    tablerIconProps,
  );

  // tabler-icons: plus
export const PlusIcon = createIcon(
  <svg strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>,
  tablerIconProps,
);

export const PencilIcon = createIcon(
  <g strokeWidth="1.25">
    <path
      clipRule="evenodd"
      d="m7.643 15.69 7.774-7.773a2.357 2.357 0 1 0-3.334-3.334L4.31 12.357a3.333 3.333 0 0 0-.977 2.357v1.953h1.953c.884 0 1.732-.352 2.357-.977Z"
    />
    <path d="m11.25 5.417 3.333 3.333" />
  </g>,

  modifiedTablerIconProps,
);

export const ZoomInIcon = createIcon(
  <path strokeWidth="1.25" d="M10 4.167v11.666M4.167 10h11.666" />,
  modifiedTablerIconProps,
);

export const ZoomOutIcon = createIcon(
  <path d="M5 10h10" strokeWidth="1.25" />,
  modifiedTablerIconProps,
);

export const TrashIcon = createIcon(
  <path
    strokeWidth="1.25"
    d="M3.333 5.833h13.334M8.333 9.167v5M11.667 9.167v5M4.167 5.833l.833 10c0 .92.746 1.667 1.667 1.667h6.666c.92 0 1.667-.746 1.667-1.667l.833-10M7.5 5.833v-2.5c0-.46.373-.833.833-.833h3.334c.46 0 .833.373.833.833v2.5"
  />,
  modifiedTablerIconProps,
);

export const MoonIcon = createIcon(
  <path
    clipRule="evenodd"
    d="M10 2.5h.328a6.25 6.25 0 0 0 6.6 10.372A7.5 7.5 0 1 1 10 2.493V2.5Z"
    stroke="currentColor"
  />,
  modifiedTablerIconProps,
);

export const SunIcon = createIcon(
  <g
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM10 4.167V2.5M14.167 5.833l1.166-1.166M15.833 10H17.5M14.167 14.167l1.166 1.166M10 15.833V17.5M5.833 14.167l-1.166 1.166M5 10H3.333M5.833 5.833 4.667 4.667" />
  </g>,
  modifiedTablerIconProps,
);


export const save = createIcon(
  "M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z",
  { width: 448, height: 512 },
);

export const saveAs = createIcon(
  "M252 54L203 8a28 27 0 00-20-8H28C12 0 0 12 0 27v195c0 15 12 26 28 26h204c15 0 28-11 28-26V73a28 27 0 00-8-19zM130 213c-21 0-37-16-37-36 0-19 16-35 37-35 20 0 37 16 37 35 0 20-17 36-37 36zm56-169v56c0 4-4 6-7 6H44c-4 0-7-2-7-6V42c0-4 3-7 7-7h133l4 2 3 2a7 7 0 012 5z M296 201l87 95-188 205-78 9c-10 1-19-8-18-20l9-84zm141-14l-41-44a31 31 0 00-46 0l-38 41 87 95 38-42c13-14 13-36 0-50z",
  { width: 448, height: 512 },
);

// tabler-icon: folder
export const LoadIcon = createIcon(
  <path
    d="m9.257 6.351.183.183H15.819c.34 0 .727.182 1.051.506.323.323.505.708.505 1.05v5.819c0 .316-.183.7-.52 1.035-.337.338-.723.522-1.037.522H4.182c-.352 0-.74-.181-1.058-.5-.318-.318-.499-.705-.499-1.057V5.182c0-.351.181-.736.5-1.054.32-.321.71-.503 1.057-.503H6.53l2.726 2.726Z"
    strokeWidth="1.25"
  />,
  modifiedTablerIconProps,
);

export const ExportIcon = createIcon(
  <path
    strokeWidth="1.25"
    d="M3.333 14.167v1.666c0 .92.747 1.667 1.667 1.667h10c.92 0 1.667-.746 1.667-1.667v-1.666M5.833 9.167 10 13.333l4.167-4.166M10 3.333v10"
  />,
  modifiedTablerIconProps,
);


export const zoomIn = createIcon(
  "M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z",
  { width: 448, height: 512 },
);

export const zoomOut = createIcon(
  "M416 208H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z",
  { width: 448, height: 512 },
);

export const UndoIcon = createIcon(
  <path
    d="M7.5 10.833 4.167 7.5 7.5 4.167M4.167 7.5h9.166a3.333 3.333 0 0 1 0 6.667H12.5"
    strokeWidth="1.25"
  />,
  modifiedTablerIconProps,
);

export const RedoIcon = createIcon(
  <path
    d="M12.5 10.833 15.833 7.5 12.5 4.167M15.833 7.5H6.667a3.333 3.333 0 1 0 0 6.667H7.5"
    strokeWidth="1.25"
  />,
  modifiedTablerIconProps,
);

// tabler-icons: circle
export const EllipseIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <circle cx="12" cy="12" r="9"></circle>
  </g>,

  tablerIconProps,
);

export const FreeDrawIcon = createIcon(
  <g>
  <path d="M 2 18 C 6 6.25, 8.5 9.25, 11.5 12 S 17 12, 19 5" strokeWidth="1.5" />
  </g>,
  modifiedTablerIconProps,
);

export const LineIcon = createIcon(
  <g>
  <path d="M 0 17 L 20 6" strokeWidth="1.5" />
  </g>,
  modifiedTablerIconProps,
);


export const LineIcon2 = createIcon(
  <g>
  <path d="M 3 15 L 17 6" strokeWidth="1.5" />
  <circle cx="3" cy="15" r="2" fill="white" strokeWidth="0.5"></circle>
  <circle cx="17" cy="6" r="2" fill="white" strokeWidth="0.5"></circle>
  </g>,
  modifiedTablerIconProps,
);

export const LineIconDark = createIcon(
  <g>
  <path d="M 0 17 L 20 6" strokeWidth="1.5" />
  </g>,
  modifiedTablerIconProps,
);

export const LineIconDark2 = createIcon(
  <g>
  <path d="M 3 15 L 17 6" strokeWidth="1.5" />
  <circle cx="3" cy="15" r="2" fill="#303535" strokeWidth="0.7"></circle>
  <circle cx="17" cy="6" r="2" fill="#303535" strokeWidth="0.7"></circle>
  </g>,
  modifiedTablerIconProps,
);

export const CircleArcIcon = createIcon(
  <g>
  <path d="M 2.5 17.5 A 9 9 0 0 1 17.5 8 " strokeWidth="1.5" />
  </g>,
  modifiedTablerIconProps,
);


export const CircleArcIcon2 = createIcon(
  <g>
  <path d="M 2.5 15 A 6 6 0 0 1 17.5 12 " strokeWidth="1.5" />
  <circle cx="2.5" cy="15" r="2" fill="white" strokeWidth="0.5"></circle>
  <circle cx="9.5" cy="5.9" r="2" fill="white" strokeWidth="0.5"></circle>
  <circle cx="17.5" cy="12" r="2" fill="white" strokeWidth="0.5"></circle>
  </g>,
  modifiedTablerIconProps,
);

export const CircleArcIconDark = createIcon(
  <g>
  <path d="M 2.5 17.5 A 9 9 0 0 1 17.5 8 " strokeWidth="1.5" />
  </g>,
  modifiedTablerIconProps,
);

export const CircleArcIconDark2 = createIcon(
  <g>
  <path d="M 2.5 15 A 6 6 0 0 1 17.5 12 " strokeWidth="1.5" />
  <circle cx="2.5" cy="15" r="2" fill="#303535" strokeWidth="0.7"></circle>
  <circle cx="9.5" cy="5.9" r="2" fill="#303535" strokeWidth="0.7"></circle>
  <circle cx="17.5" cy="12" r="2" fill="#303535" strokeWidth="0.7"></circle>
  </g>,
  modifiedTablerIconProps,
);

// custom
export const SelectionIcon = createIcon(
  <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 7.5 l 2.75 11.11 l 1.54 -3.96 l 5.06 5.225 l 3.025 -2.86 l -5.06 -5.17 l 3.74 -1.925 Z "/>

  </g>,
  { fill: "none", width: 22, height: 22, strokeWidth: 1.25 },
);

// custom
export const ShiftIcon = createIcon(
  <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M5,21 L19,21 L5,21 Z M16,12 L16,17 L8,17 L8,12 L3,12 L12,3 L21,12 L16,12 Z "/>

  </g>,
  { fill: "none", width: 22, height: 22, strokeWidth: 1.25 },
);

export const MultipleSelectionIcon = createIcon(
  <g stroke="currentColor" strokeLinecap="round">
    <path strokeDasharray="1 2" d="M3,3 h13  v8 m -5 5  h-8  v -13  " />
    <path d="M12 12 l 2.0625 8.3325 l 1.155 -2.97 l 3.795 3.91875 l 2.26875 -2.145 l -3.795 -3.8775 l 2.805 -1.44375 Z "/>
  </g>,
  { fill: "none", width: 22, height: 22, strokeWidth: 1 },
);

//    <path stroke-dasharray="2 3.5" d="M4,4 h11 a 3 3 0 0 1 3 3 v11 a 3 3 0 0 1 -3 3 h-11 a 3 3 0 0 1 -3 -3 v -11 a 3 3 0 0 1 3 -3 " />
export const SelectionBoxIcon = createIcon(
  <g stroke="currentColor" strokeLinecap="round">
    <path strokeDasharray="1 2.2" d="M4,5 h16  v16  h-16  v -16  " />
  </g>,
  { fill: "none", width: 22, height: 22, strokeWidth: 1.2 },
);

export const KnotVectorEditorIcon = createIcon(
  <g strokeLinecap="round">
  <path d="M 0 10 L 6 10" strokeWidth="1.2" />
  <path d="M 14 10 L 20 10" strokeWidth="1.2" />
  <path d="M 10 8 L 10 12.5" strokeWidth="4" />
  </g>,
  modifiedTablerIconProps,
);

export const UpArrowIcon = createIcon(
  <g strokeLinecap="round">
  <path d="M 0 15 L 10 5" strokeWidth="1.5" />
  <path d="M 10 5 L 20 15" strokeWidth="1.5" />
  </g>,
  modifiedTablerIconProps,
);

export const DownArrowIcon = createIcon(
  <g strokeLinecap="round">
  <path d="M 0 8 L 10 18" strokeWidth="1.5" />
  <path d="M 10 18 L 20 8" strokeWidth="1.5" />
  </g>,
  modifiedTablerIconProps,
);

export const InsertKnotIcon = createIcon(
  <g strokeLinecap="round">
  <path d="M 0 10 L 6 10" strokeWidth="1.2" />
  <path d="M 14 10 L 20 10" strokeWidth="1.2" />
  <path d="M 10 8 L 10 12.5" strokeWidth="4" />
  </g>,
  modifiedTablerIconProps,
);

export const DeleteKnotIcon = createIcon(
  <g strokeLinecap="round">
  <path d="M 0 10 L 6 10" strokeWidth="1.2" />
  <path d="M 14 10 L 20 10" strokeWidth="1.2" />
  <path d="M 10 8 L 10 12.5" strokeWidth="4" />
  <path d="M 6 6 L 14 14.5" strokeWidth="1.2" />
  </g>,
  modifiedTablerIconProps,
);





export const EraserIcon = createIcon(
  <g strokeWidth="1.25">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M19 20 h -10.5 l -4.21 -4.3 a 2 2 0 0 1 0 -1.41 l 10 -10 a 2 2 0 0 1 1.41 0 l 5 5 a 2 2 0 0 1 0 1.41 l -9.2 9.3" />
    <path d="M18 13.3l -6.3 -6.3" />
    <path d="M8.5 20 h -5" />
  </g>,
  tablerIconProps,
);

export const DuplicateIcon = createIcon(
  <g strokeWidth="1.25">
    <path d="M14.375 6.458H8.958a2.5 2.5 0 0 0-2.5 2.5v5.417a2.5 2.5 0 0 0 2.5 2.5h5.417a2.5 2.5 0 0 0 2.5-2.5V8.958a2.5 2.5 0 0 0-2.5-2.5Z" />
    <path
      clipRule="evenodd"
      d="M11.667 3.125c.517 0 .986.21 1.325.55.34.338.55.807.55 1.325v1.458H8.333c-.485 0-.927.185-1.26.487-.343.312-.57.75-.609 1.24l-.005 5.357H5a1.87 1.87 0 0 1-1.326-.55 1.87 1.87 0 0 1-.549-1.325V5c0-.518.21-.987.55-1.326.338-.34.807-.549 1.325-.549h6.667Z"
    />
  </g>,
  modifiedTablerIconProps,
);

// tabler-icons: lock-open (via Figma)
export const UnlockedIcon = createIcon(
  <g>
    <path
      d="M13.542 8.542H6.458a2.5 2.5 0 0 0-2.5 2.5v3.75a2.5 2.5 0 0 0 2.5 2.5h7.084a2.5 2.5 0 0 0 2.5-2.5v-3.75a2.5 2.5 0 0 0-2.5-2.5Z"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path
      d="M10 13.958a1.042 1.042 0 1 0 0-2.083 1.042 1.042 0 0 0 0 2.083Z"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <mask
      id="UnlockedIcon"
      style={{ maskType: "alpha" }}
      maskUnits="userSpaceOnUse"
      x={6}
      y={1}
      width={9}
      height={9}
    >
      <path
        stroke="none"
        d="M6.399 9.561V5.175c0-.93.401-1.823 1.116-2.48a3.981 3.981 0 0 1 2.693-1.028c1.01 0 1.98.37 2.694 1.027.715.658 1.116 1.55 1.116 2.481"
        fill="#fff"
      />
    </mask>
    <g mask="url(#UnlockedIcon)">
      <path
        stroke="none"
        d="M5.149 9.561v1.25h2.5v-1.25h-2.5Zm5.06-7.894V.417v1.25Zm2.559 3.508v1.25h2.5v-1.25h-2.5ZM7.648 8.51V5.175h-2.5V8.51h2.5Zm0-3.334c0-.564.243-1.128.713-1.561L6.668 1.775c-.959.883-1.52 2.104-1.52 3.4h2.5Zm.713-1.561a2.732 2.732 0 0 1 1.847-.697v-2.5c-1.31 0-2.585.478-3.54 1.358L8.36 3.614Zm1.847-.697c.71 0 1.374.26 1.847.697l1.694-1.839a5.231 5.231 0 0 0-3.54-1.358v2.5Zm1.847.697c.47.433.713.997.713 1.561h2.5c0-1.296-.56-2.517-1.52-3.4l-1.693 1.839Z"
        fill="currentColor"
      />
    </g>
  </g>,
  modifiedTablerIconProps,
);

// tabler-icons: lock (via Figma)
export const LockedIcon = createIcon(
  <g strokeWidth="1.25">
    <path d="M 13.542 8.542 H 6.458 a 2.5 2.5 0 0 0 -2.5 2.5 v 3.75 a 2.5 2.5 0 0 0 2.5 2.5 h 7.084 a 2.5 2.5 0 0 0 2.5-2.5 v -3.75 a 2.5 2.5 0 0 0 -2.5 -2.5 Z" />
    <path d="M 10 13.958 a 1.042 1.042 0 1 0 0 -2.083 a 1.042 1.042 0 0 0 0 2.083 Z" />
    <path d="M 6.667 8.333V5.417C6.667 3.806 8.159 2.5 10 2.5c1.841 0 3.333 1.306 3.333 2.917v2.916" />
  </g>,
  modifiedTablerIconProps,
);

export const ExportImageIcon = createIcon(
  <g strokeWidth="1.25">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
    <path d="M15 8h.01"></path>
    <path d="M12 20h-5a3 3 0 0 1 -3 -3v-10a3 3 0 0 1 3 -3h10a3 3 0 0 1 3 3v5"></path>
    <path d="M4 15l4 -4c.928 -.893 2.072 -.893 3 0l4 4"></path>
    <path d="M14 14l1 -1c.617 -.593 1.328 -.793 2.009 -.598"></path>
    <path d="M19 16v6"></path>
    <path d="M22 19l-3 3l-3 -3"></path>
  </g>,
  tablerIconProps,
);


