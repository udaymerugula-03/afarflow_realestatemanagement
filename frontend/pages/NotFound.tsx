import Link from "../components/link";
import { Footer, PublicHeader } from "../components/ui";
export default function NotFound() { return <><PublicHeader /><main id="main-content" className="container section empty"><p className="eyebrow">404 · A SMALL DETOUR</p><h1>This place isn’t on the map.</h1><p>Let’s find you somewhere better.</p><Link className="button" href="/properties">Explore properties ↗</Link></main><Footer /></>; }
