import { Marketplace } from "../components/marketplace";
import { Footer, PublicHeader } from "../components/ui";
import { useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
export default function Properties() {
  const { search } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [search]);
  return <><PublicHeader /><main ref={mainRef} tabIndex={-1} id="main-content" className="container section public-collection"><div className="collection-page-heading"><div><p className="eyebrow">THE PROPERTY COLLECTION</p><h1 className="page-title">A place for what's next.</h1><p className="intro">Find a home, a fresh start, or space for a bigger idea.</p></div><span className="collection-heading-note">BUY. RENT. MAKE YOUR MOVE.<span>Properties across Pakistan</span></span></div><Marketplace key={search} /></main><Footer /></>;
}
