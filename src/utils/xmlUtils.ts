export interface WidgetProperty {
  key: string;
  type: string;
  caption: string;
  description?: string;
  defaultValue?: string;
  isList?: boolean;
}

/**
 * Basic XML parser to extract properties from a Mendix widget XML file.
 */
export function parseWidgetProps(xml: string): WidgetProperty[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const props: WidgetProperty[] = [];

  const propertyElements = doc.getElementsByTagName('property');
  for (let i = 0; i < propertyElements.length; i++) {
    const el = propertyElements[i];
    const key = el.getAttribute('key') || '';
    const type = el.getAttribute('type') || 'string';
    
    // Check if it's a list property
    const isList = el.getAttribute('isList') === 'true';

    const captionEl = el.getElementsByTagName('caption')[0];
    const caption = captionEl ? captionEl.textContent || key : key;

    const descEl = el.getElementsByTagName('description')[0];
    const description = descEl ? descEl.textContent || '' : '';

    const defaultEl = el.getElementsByTagName('defaultValue')[0];
    const defaultValue = defaultEl ? defaultEl.textContent || '' : '';

    if (key) {
      props.push({ key, type, caption, description, defaultValue, isList });
    }
  }

  return props;
}
