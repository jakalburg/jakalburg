export interface ParsedUserAgent {
  browser?: string;
  os?: string;
  deviceType?: string;
}

/**
 * Hand-rolled, "good enough for triage" UA parser - no UA-parsing dependency
 * exists anywhere in this repo. Mirrors
 * server/src/common/utils/user-agent-parser.util.ts (duplicated, not
 * imported, since admin/client/server are separate packages with no shared
 * workspace).
 */
export function parseUserAgent(ua: string): ParsedUserAgent {
  if (!ua) return {};

  let browser: string | undefined;
  let m: RegExpMatchArray | null;

  if ((m = ua.match(/Edg\/([\d.]+)/))) {
    browser = `Edge ${m[1]}`;
  } else if ((m = ua.match(/OPR\/([\d.]+)/))) {
    browser = `Opera ${m[1]}`;
  } else if ((m = ua.match(/SamsungBrowser\/([\d.]+)/))) {
    browser = `Samsung Internet ${m[1]}`;
  } else if ((m = ua.match(/Chrome\/([\d.]+)/)) && !/Chromium/.test(ua)) {
    browser = `Chrome ${m[1]}`;
  } else if ((m = ua.match(/Firefox\/([\d.]+)/))) {
    browser = `Firefox ${m[1]}`;
  } else if (/Safari/.test(ua) && (m = ua.match(/Version\/([\d.]+)/))) {
    browser = `Safari ${m[1]}`;
  } else if (/Safari/.test(ua)) {
    browser = "Safari";
  }

  let os: string | undefined;
  if (/Windows NT 10\.0/.test(ua)) os = "Windows 10";
  else if (/Windows NT 6\.3/.test(ua)) os = "Windows 8.1";
  else if (/Windows NT 6\.1/.test(ua)) os = "Windows 7";
  else if (/Windows/.test(ua)) os = "Windows";
  else if ((m = ua.match(/Mac OS X ([\d_]+)/))) os = `macOS ${m[1].replace(/_/g, ".")}`;
  else if ((m = ua.match(/Android ([\d.]+)/))) os = `Android ${m[1]}`;
  else if ((m = ua.match(/iPhone OS ([\d_]+)/))) os = `iOS ${m[1].replace(/_/g, ".")}`;
  else if ((m = ua.match(/CPU OS ([\d_]+)/))) os = `iOS ${m[1].replace(/_/g, ".")}`;
  else if (/Linux/.test(ua)) os = "Linux";

  let deviceType = "Desktop";
  if (/iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) {
    deviceType = "Tablet";
  } else if (/Mobi|iPhone|iPod/.test(ua)) {
    deviceType = "Mobile";
  }

  return { browser, os, deviceType };
}
