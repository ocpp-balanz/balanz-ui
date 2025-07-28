import { Box } from "@mui/material";
import { useEffect, useRef } from "react";

export default function LogViewer({
  logs,
}: {
  logs: { timestamp: string; level: string; logger: string; message: string }[];
}) {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  // Sync horizontal scroll between top and main views
  useEffect(() => {
    const top = topScrollRef.current;
    const main = mainScrollRef.current;
    if (!top || !main) return;

    const syncMainToTop = () => {
      if (main.scrollLeft !== top.scrollLeft) main.scrollLeft = top.scrollLeft;
    };
    const syncTopToMain = () => {
      if (top.scrollLeft !== main.scrollLeft) top.scrollLeft = main.scrollLeft;
    };

    top.addEventListener("scroll", syncMainToTop);
    main.addEventListener("scroll", syncTopToMain);
    return () => {
      top.removeEventListener("scroll", syncMainToTop);
      main.removeEventListener("scroll", syncTopToMain);
    };
  }, []);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    const main = mainScrollRef.current;
    if (main) {
      main.scrollTop = main.scrollHeight;
    }
  }, [logs]);

  // Longest line for sizing top scrollbar
  const longestLine = logs.reduce((longest, log) => {
    const line = `${log.timestamp} ${log.level} ${log.logger}: ${log.message}`;
    return line.length > longest.length ? line : longest;
  }, "");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0, // allow flex children to shrink
        fontFamily: "monospace",
        border: "1px solid #ccc",
        backgroundColor: "#fafafa",
        overflow: "hidden", // prevent parent scroll
      }}
    >
      <Box
        ref={topScrollRef}
        sx={{
          overflowX: "auto",
          overflowY: "hidden",
          width: "100%",
        }}
      >
        <Box
          sx={{
            width: "max-content",
            height: 1,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
        </Box>
      </Box>

      {/* Main scrollable log content */}
      <Box
        ref={mainScrollRef}
        sx={{
          flex: 1,
          overflow: "auto", // Only this container scrolls vertically
        }}
      >
        <Box
          sx={{
            display: "inline-block",
            minWidth: "100%",
          }}
        >
          {logs.map((log, i) => (
            <Box
              key={i}
              sx={{
                textAlign: "left",
                py: 0.1,
                whiteSpace: "nowrap",
              }}
            >
              {`${log.timestamp} ${log.level} ${log.logger}: ${log.message}`}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
