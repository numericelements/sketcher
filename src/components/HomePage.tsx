import { useEffect } from 'react';
import './HomePage.css';
import { Link } from 'react-router-dom';


function HomePage() {
  useEffect(() => {
    document.body.className = 'homepage'
    return () => {
      document.body.className = ''
    }
  })
  const style1 = {"--i": 1} as React.CSSProperties
  const style2 = {"--i": 2} as React.CSSProperties
  const style3 = {"--i": 3} as React.CSSProperties
  const style4 = {"--i": 4} as React.CSSProperties
  return (
    <div className="prevent-select">
        <div className="logo">
          NUMERIC ELEMENTS
            <span className="shade">&nbsp;</span>
        </div>
      <div className="container">
      <ul className="links">
        <li className="link" style={style1} >
          <Link to="/sketcher">
            <span>SKETCHER</span>
          </Link>
        </li>
        <li className="link" style={style2}>
          <a href="https://github.com/numericelements">GITHUB</a>
        </li>
        {/* 
        <li className="link" style={style3}>
          <a >DOCS</a>
        </li>
        */}
        <li className="link" style={style4}>
          <a href="https://discord.gg/7hMWSvFzrB">Community</a>
        </li>
      
      </ul>
      </div>
    </div>
  );
}

export default HomePage;