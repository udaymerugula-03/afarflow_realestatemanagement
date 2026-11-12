import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Link from "../components/link";
import { Footer, PublicHeader } from "../components/ui";
import { Marketplace } from "../components/marketplace";
import { Icon } from "../components/icons";
import { demoImage } from "../lib/api";

const categories = [
  { type: "house", name: "Homes", detail: "Room for your next chapter", icon: "home" },
  { type: "apartment", name: "Apartments", detail: "City living, your way", icon: "building" },
  { type: "plot", name: "Plots & land", detail: "Build on your possibilities", icon: "land" },
  { type: "commercial", name: "Commercial", detail: "A place for your ambition", icon: "office" },
] as const;
const steps = [
  { number: "01", title: "Find your kind of place", text: "Explore by city, budget and property type. Make space for what matters to you.", icon: "search" },
  { number: "02", title: "Start a conversation", text: "Send an inquiry on a listing. Share your questions with the team managing it.", icon: "message" },
  { number: "03", title: "Take the next step", text: "Connect with the agency to arrange a visit and explore the possibilities in person.", icon: "key" },
] as const;

export default function Home() {
  const [purpose, setPurpose] = useState("sale");
  const navigate = useNavigate();
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams({ purpose });
    for (const key of ["city", "type"]) {
      const value = String(data.get(key) || "").trim();
      if (value) params.set(key, value);
    }
    navigate(`/properties?${params}`);
  }
  return <>
    <PublicHeader />
    <main id="main-content" className="marketplace-home">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow"><span className="gold-dot" />A BETTER WAY TO FIND YOUR PLACE</p>
            <h1>A new place.<br />A <em>new beginning.</em></h1>
            <p>From a first apartment to a home for what comes next. Discover properties across Pakistan, and connect with the people who know them.</p>
            <form className="hero-search" onSubmit={search}>
              <div className="search-tabs" aria-label="Property purpose">
                <button type="button" className={purpose === "sale" ? "selected" : ""} aria-pressed={purpose === "sale"} onClick={() => setPurpose("sale")}>Buy a property</button>
                <button type="button" className={purpose === "rent" ? "selected" : ""} aria-pressed={purpose === "rent"} onClick={() => setPurpose("rent")}>Find a rental</button>
              </div>
              <div className="hero-search-fields">
                <label><span><Icon name="location" size={15} />LOCATION</span><select name="city" aria-label="Search city"><option value="">All cities</option><option>Lahore</option><option>Islamabad</option><option>Karachi</option></select></label>
                <label><span><Icon name="home" size={15} />PROPERTY TYPE</span><select name="type" aria-label="Search property type"><option value="">All properties</option><option value="house">House</option><option value="apartment">Apartment</option><option value="plot">Plot</option><option value="commercial">Commercial</option></select></label>
                <button type="submit" className="hero-search-button"><Icon name="search" size={19} /><span>Find a property</span></button>
              </div>
            </form>
            <div className="hero-popular"><span>Explore cities</span>{["Lahore", "Islamabad", "Karachi"].map((city) => <Link key={city} href={`/properties?city=${city}`}>{city}<Icon name="arrow" size={12} /></Link>)}</div>
          </div>
          <div className="hero-art">
            <img className="scene" src={demoImage("hero.jpg")} alt="Sample stock photograph of a contemporary home, not an actual listed property" fetchPriority="high" />
            <div className="hero-image-shade" />
            <span className="hero-art-label"><span />YOUR NEXT CHAPTER STARTS HERE</span>
            <div className="hero-image-caption"><span>A LITTLE MORE SPACE TO</span><strong>Live your kind of life.</strong></div>
            <div className="floating-label"><span className="floating-icon"><Icon name="home" size={22} /></span><div><strong>More than an address.</strong><small>A place to make your own.</small></div><span className="floating-check"><Icon name="check" size={15} /></span></div>
          </div>
        </div>
      </section>
      <div className="trust-strip"><div className="container"><span>REAL ESTATE,<br /><strong>WITHOUT THE RUNAROUND.</strong></span><div><Icon name="search" /><span>Search that makes sense</span></div><div><Icon name="message" /><span>Direct agency inquiries</span></div><div><Icon name="home" /><span>Buy, rent, move forward</span></div></div></div>
      <section className="container section category-section">
        <div className="section-heading"><div><p className="eyebrow">A SPACE FOR EVERY PLAN</p><h2>What are you looking for?</h2></div><Link className="text-link section-link" href="/properties">Explore all properties <Icon name="arrow" size={17} /></Link></div>
        <div className="category-grid">{categories.map((category) => <Link className="category-card" key={category.type} href={`/properties?type=${category.type}`}><span className="category-icon"><Icon name={category.icon} size={26} /></span><h3>{category.name}</h3><p>{category.detail}</p><Icon name="arrow" size={19} className="category-arrow" /></Link>)}</div>
      </section>
      <section className="collection-section"><div className="container section"><div className="section-heading"><div><p className="eyebrow">THE PROPERTY COLLECTION</p><h2>Your next chapter is out there.</h2><p className="section-description">Discover the latest places available to buy or rent.</p></div><Link className="text-link section-link" href="/properties">View the collection <Icon name="arrow" size={17} /></Link></div><Marketplace compact /></div></section>
      <section className="container section how-section"><div className="section-heading"><div><p className="eyebrow">LESS FRICTION. MORE POSSIBILITY.</p><h2>From the first look<br />to the next step.</h2></div><p>Finding a property should feel like<br />moving forward, not going in circles.</p></div><div className="how-grid">{steps.map((step) => <article className="how-card" key={step.number}><div><span className="how-icon"><Icon name={step.icon} size={24} /></span><span className="how-number">{step.number}</span></div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>
      <section className="container callout"><div><p className="eyebrow">LET'S MAKE THE NEXT MOVE YOURS</p><h2>A good place starts<br />with a conversation.</h2><p>Tell the listing team what you have in mind.<br />The right questions can open the right doors.</p></div><Link className="button light" href="/contact">Let's find your place <Icon name="arrow" size={19} /></Link><span className="callout-decoration" aria-hidden="true"><Icon name="home" size={190} /></span></section>
    </main>
    <Footer />
  </>;
}
