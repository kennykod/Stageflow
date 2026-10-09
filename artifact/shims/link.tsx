// Stand-in for next/link in the standalone artifact build (in-memory routing).
import * as React from "react";
import { useRouterState } from "../router-context";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean; scroll?: boolean; replace?: boolean };

const Link = React.forwardRef<HTMLAnchorElement, Props>(function Link({ href, onClick, prefetch: _p, scroll: _s, replace, ...rest }, ref) {
  const r = useRouterState();
  return (
    <a
      ref={ref}
      href={`#${href}`}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
          e.preventDefault();
          if (!e.defaultPrevented) r.navigate(href, { replace });
          return;
        }
        e.preventDefault();
        r.navigate(href, { replace });
      }}
      {...rest}
    />
  );
});

export default Link;
