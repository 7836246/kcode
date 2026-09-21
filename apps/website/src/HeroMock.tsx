import heroVisual from "./vendor/hero-visual.html?raw";

export function HeroMock() {
  return <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: heroVisual }} />;
}
