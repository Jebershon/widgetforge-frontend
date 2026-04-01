/**
 * Mendix Widget XML Utilities
 * Parses Mendix Studio Pro 8 widget XML definitions.
 * Supports all official property types from the Mendix documentation:
 * attribute, boolean, entity, entityConstraint, enumeration, form, image,
 * integer, decimal, microflow, nanoflow, object, string, translatableString
 */

export interface WidgetProperty {
  key: string;
  type: string;
  caption: string;
  description?: string;
  defaultValue?: string;
  group?: string;
  required?: boolean;
  isList?: boolean;
  multiline?: boolean;
  linkedDataSource?: string;
  entityProperty?: string;
  attributeTypes?: string[];         // allowed attribute types e.g. ['String', 'Integer']
  options?: { key: string; caption: string }[];
  nestedProperties?: WidgetProperty[];
}

/**
 * Parses a single <property> element into a WidgetProperty.
 */
function parsePropertyElement(el: Element, group?: string): WidgetProperty | null {
  const key = el.getAttribute('key') || '';
  if (!key) return null;

  const type = el.getAttribute('type') || 'string';
  const isList = el.getAttribute('isList') === 'true';
  const required = el.getAttribute('required') !== 'false'; // default true
  const multiline = el.getAttribute('multiline') === 'true';
  const linkedDataSource = el.getAttribute('dataSource') || undefined;
  const entityProperty = el.getAttribute('entityProperty') || undefined;

  // Caption: direct child <caption> element
  const children = Array.from(el.children);
  const captionEl = children.find(c => c.tagName === 'caption');
  const caption = captionEl ? captionEl.textContent?.trim() || key : key;

  // Description: direct child <description> element
  const descEl = children.find(c => c.tagName === 'description');
  const description = descEl ? descEl.textContent?.trim() || '' : '';

  // Default value: pluggable widgets use XML attribute for integer/decimal/boolean,
  // and child <defaultValue> element for string/enumeration.
  const defaultValueAttr = el.getAttribute('defaultValue');
  const defaultEl = children.find(c => c.tagName === 'defaultValue');
  const defaultValue = defaultValueAttr ?? (defaultEl ? defaultEl.textContent?.trim() || '' : '');

  // Enumeration options
  const options: { key: string; caption: string }[] = [];
  const enumValuesEl = children.find(c => c.tagName === 'enumerationValues');
  if (enumValuesEl) {
    Array.from(enumValuesEl.children).forEach(ev => {
      if (ev.tagName === 'enumerationValue') {
        options.push({
          key: ev.getAttribute('key') || '',
          caption: ev.textContent?.trim() || ev.getAttribute('key') || ''
        });
      }
    });
  }

  // Attribute types (for type="attribute" properties)
  const attributeTypes: string[] = [];
  const attrTypesEl = children.find(c => c.tagName === 'attributeTypes');
  if (attrTypesEl) {
    Array.from(attrTypesEl.children).forEach(at => {
      if (at.tagName === 'attributeType') {
        const name = at.getAttribute('name');
        if (name) attributeTypes.push(name);
      }
    });
  }

  // Nested properties (for type="object")
  let nestedProperties: WidgetProperty[] | undefined;
  const nestedPropsContainer = children.find(c => c.tagName === 'properties');
  if (nestedPropsContainer) {
    nestedProperties = [];
    Array.from(nestedPropsContainer.children).forEach(child => {
      if (child.tagName === 'property') {
        const nested = parsePropertyElement(child as Element);
        if (nested) nestedProperties!.push(nested);
      } else if (child.tagName === 'propertyGroup') {
        const groupCaption = child.getAttribute('caption') || '';
        Array.from(child.children).forEach(gc => {
          if (gc.tagName === 'property') {
            const nested = parsePropertyElement(gc as Element, groupCaption);
            if (nested) nestedProperties!.push(nested);
          }
        });
      }
    });
  }

  const prop: WidgetProperty = {
    key,
    type,
    caption,
    description: description || undefined,
    defaultValue: defaultValue || undefined,
    group,
    required,
    isList,
    multiline: multiline || undefined,
    linkedDataSource,
    entityProperty,
    attributeTypes: attributeTypes.length > 0 ? attributeTypes : undefined,
    options: options.length > 0 ? options : undefined,
    nestedProperties: nestedProperties && nestedProperties.length > 0 ? nestedProperties : undefined
  };

  return prop;
}

/**
 * Parses a Mendix widget XML string and returns all widget properties
 * in a flat list, preserving group information and nested structure.
 *
 * Supports the full official Mendix Studio Pro 8 property type list.
 */
export function parseWidgetProps(xml: string): WidgetProperty[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const props: WidgetProperty[] = [];

  const propertiesRoot = doc.getElementsByTagName('properties')[0];
  if (!propertiesRoot) return props;

  function processContainer(container: Element) {
    Array.from(container.children).forEach(child => {
      if (child.tagName === 'propertyGroup') {
        const groupCaption = child.getAttribute('caption') || '';
        Array.from(child.children).forEach(gc => {
          if (gc.tagName === 'property') {
            const p = parsePropertyElement(gc as Element, groupCaption);
            if (p) props.push(p);
          }
        });
      } else if (child.tagName === 'property') {
        const p = parsePropertyElement(child as Element);
        if (p) props.push(p);
      }
    });
  }

  processContainer(propertiesRoot);

  return props;
}

/**
 * Helper: Returns a human-friendly label for a property type.
 */
export function friendlyTypeName(type: string): string {
  const names: Record<string, string> = {
    attribute: 'Attribute',
    boolean: 'Boolean',
    entity: 'Entity',
    entityConstraint: 'XPath Constraint',
    enumeration: 'Enumeration',
    form: 'Page',
    image: 'Image',
    integer: 'Integer',
    decimal: 'Decimal',
    microflow: 'Microflow',
    nanoflow: 'Nanoflow',
    object: 'Object',
    string: 'String',
    translatableString: 'Translatable String',
    datasource: 'Data Source',
    action: 'Action',
  };
  return names[type] || type;
}
