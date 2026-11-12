import Link from "../components/link";
import { Footer, PublicHeader, Scene } from "../components/ui";
import { Icon } from "../components/icons";

export default function Contact() {
  return <>
    <PublicHeader />
    <main id="main-content" className="container section contact-page">
      <p className="eyebrow">GOOD MOVES START WITH A CONVERSATION</p>
      <h1 className="page-title">Let's open<br /><span style={{ color: "var(--teal)" }}>a few doors.</span></h1>
      <div className="contact-grid">
        <div>
          <p className="intro">A first home, a new neighborhood, or a fresh opportunity. Wherever you're headed, start with the people who know the property.</p>
          <div className="panel"><span className="category-icon"><Icon name="message" size={23} /></span><h2>Have a property in mind?</h2><p>Open a listing and send an inquiry to its agency. Your questions and contact details reach the team managing that property.</p><Link href="/properties" className="button">Explore properties <Icon name="arrow" size={16} /></Link></div>
          <div className="panel"><h2>Already part of the team?</h2><p>Your agency workspace brings inventory, lead follow-ups, visits and deals into one place.</p><Link href="/login" className="text-link">Admin / Agent sign in <Icon name="arrow" size={16} /></Link></div>
          <p className="fine-print">Property inquiries require your consent. This page provides guidance; it does not submit a general contact message. For account access, contact your agency administrator.</p>
        </div>
        <div><div className="contact-art"><Scene /></div><p className="contact-caption">THE NEXT CHAPTER COULD BE JUST A CONVERSATION AWAY.</p></div>
      </div>
    </main>
    <Footer />
  </>;
}
