import HeritageHeader from "./HeritageHeader";
import "./HeritagePage.css";

function HeritagePage({
  active,
  eyebrow,
  title,
  description,
  action,
  className = "",
  children,
}) {
  return (
    <div className={`heritage-page-shell ${className}`.trim()}>
      <HeritageHeader active={active} />

      <main className="heritage-page-main">
        <header className="heritage-page-intro">
          <div>
            {eyebrow && <p className="heritage-page-eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
            {description && <p className="heritage-page-description">{description}</p>}
          </div>
          {action && <div className="heritage-page-action">{action}</div>}
        </header>

        {children}
      </main>
    </div>
  );
}

export default HeritagePage;
