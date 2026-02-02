export default function Navbar({ isLoggedIn, session, onLoginClick, onSignupClick, onLogout }) {
  return (
    <header className="navstrip">
      <div className="navstrip-inner">
        <nav className="navlinks" aria-label="Primary">
          <a className="navlink is-active" href="#/">Home</a>
          <a className="navlink" href="#/explore">Explore</a>
          <a className="navlink" href="#/trending">Trending</a>
          <a className="navlink" href="#/popular">Popular</a>
        </nav>

        <div className="nav-center">
          <input className="nav-search" placeholder="Search PinoyFlex" />
        </div>

        <div className="navactions">
          {!isLoggedIn ? (
            <>
              <button className="btn btn-login" onClick={onLoginClick}>Log in</button>
              <button className="btn btn-register" onClick={onSignupClick}>Register</button>
            </>
          ) : (
            <>
              <div className="session-pill">@{session.username}</div>
              <button className="btn btn-logout" onClick={onLogout}>Logout</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
