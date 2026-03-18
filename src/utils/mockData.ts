import type { GeneratedFile } from '@/types'

export function MOCK_GENERATED_FILES(name: string): GeneratedFile[] {
  return [
    {
      name: 'widget.xml',
      language: 'xml',
      content: `<?xml version="1.0" encoding="utf-8"?>
<widget id="com.widgetforge.${name.toLowerCase()}" pluginWidget="true"
  needsEntityContext="true"
  xmlns="http://www.mendix.com/widget/1.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.mendix.com/widget/1.0/
    https://apidocs.mendix.com/widgetpackage/schema/1.0/widget.xsd">
  <name>${name}</name>
  <description>AI-generated widget by WidgetForge</description>
  <studioProCategory>Display</studioProCategory>
  <properties>
    <property key="value" type="integer" required="true">
      <caption>Progress Value (0-100)</caption>
      <description>Current progress percentage</description>
      <defaultValue>0</defaultValue>
    </property>
    <property key="color" type="string" required="false">
      <caption>Ring Color</caption>
      <description>CSS color for the progress ring</description>
      <defaultValue>#2563eb</defaultValue>
    </property>
    <property key="statusText" type="string" required="false">
      <caption>Status Text</caption>
      <description>Label displayed below percentage</description>
      <defaultValue>In Progress</defaultValue>
    </property>
  </properties>
</widget>`,
    },
    {
      name: `${name}.tsx`,
      language: 'tsx',
      content: `import { ReactElement, useMemo } from "react";
import { ${name}ContainerProps } from "./${name}.props";
import "./ui/${name}.css";

const SIZE = 120;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ${name}({ value, color, statusText }: ${name}ContainerProps): ReactElement {
  const clampedValue = Math.min(100, Math.max(0, value ?? 0));

  const strokeDashoffset = useMemo(
    () => CIRCUMFERENCE - (clampedValue / 100) * CIRCUMFERENCE,
    [clampedValue]
  );

  const ringColor = color || "#2563eb";

  return (
    <div className="wf-progress-tracker">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={\`0 0 \${SIZE} \${SIZE}\`}
        className="wf-progress-svg"
      >
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE}
        />
        {/* Progress ring */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={ringColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          transform={\`rotate(-90 \${SIZE / 2} \${SIZE / 2})\`}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
        {/* Percentage label */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="wf-progress-value"
          fill={ringColor}
        >
          {clampedValue}%
        </text>
      </svg>
      {statusText && (
        <p className="wf-progress-status">{statusText}</p>
      )}
    </div>
  );
}

export default ${name};`,
    },
    {
      name: 'editorConfig.tsx',
      language: 'tsx',
      content: `import { StructurePreviewProps, Properties, hidePropertiesIn } from "@mendix/pluggable-widgets-tools";
import { ${name}PreviewProps } from "./${name}.props";

export function getProperties(values: ${name}PreviewProps, defaultProperties: Properties): Properties {
  if (values.value === undefined) {
    hidePropertiesIn(defaultProperties, values, ["color", "statusText"]);
  }
  return defaultProperties;
}

export function getPreview(values: ${name}PreviewProps): StructurePreviewProps {
  return {
    type: "Container",
    borders: true,
    borderRadius: 8,
    children: [
      {
        type: "Text",
        bold: true,
        content: \`Progress: \${values.value ?? 0}%\`,
      },
      {
        type: "Text",
        italic: true,
        content: values.statusText ?? "In Progress",
      },
    ],
  };
}`,
    },
    {
      name: 'package.json',
      language: 'json',
      content: `{
  "name": "com.widgetforge.${name.toLowerCase()}",
  "version": "1.0.0",
  "description": "AI-generated Mendix widget",
  "copyright": "WidgetForge AI",
  "license": "Apache-2.0",
  "packagePath": "com/widgetforge",
  "mxpackage": {
    "minimumMxVersion": "9.24.0",
    "widgetName": "${name}"
  },
  "scripts": {
    "build": "pluggable-widgets-tools build:prod",
    "dev": "pluggable-widgets-tools start:server",
    "lint": "pluggable-widgets-tools lint",
    "format": "pluggable-widgets-tools format",
    "test": "pluggable-widgets-tools test"
  },
  "devDependencies": {
    "@mendix/pluggable-widgets-tools": "^9.24.0"
  }
}`,
    },
  ]
}

export const QUICK_PROMPTS = [
  { label: 'Data Grid',    color: 'blue'   as const, prompt: 'Data grid widget with column sorting, filtering and server-side pagination with Mendix entity datasource' },
  { label: 'Chart',        color: 'blue'   as const, prompt: 'Interactive chart widget using Chart.js with switchable bar, line and pie chart modes, legend and tooltips' },
  { label: 'File Upload',  color: 'green'  as const, prompt: 'File upload widget with drag-and-drop zone, file type validation, progress bar and multi-file queue' },
  { label: 'Date Picker',  color: 'warn'   as const, prompt: 'Custom date-range picker widget with calendar popover, locale support and Mendix attribute binding' },
]
