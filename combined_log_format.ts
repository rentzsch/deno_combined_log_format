//
// Interface.
//

export type CombinedLogFormatRec = {
  remote_addr: string;
  remote_user: string;
  time_local_day: string;
  time_local_month: string;
  time_local_year: string;
  time_local_hour: string;
  time_local_minute: string;
  time_local_second: string;
  time_local_zone: string;
  request: string;
  request_method: string;
  request_path: string;
  request_http_version: string;
  status: string;
  body_bytes_sent: string;
  http_referer: string;
  http_user_agent: string;
};

export function parseCombinedLogFormatLine(line: string) {
  if (line.length === 0) {
    return new CombinedLogFormatError("LineEmpty", line);
  }

  const lineMatch = line.match(COMBINED_LINE_REGEX);
  if (lineMatch === null) {
    return new CombinedLogFormatError("LineRegexDoesntMatch", line);
  } else {
    let result = (lineMatch.groups! as unknown) as CombinedLogFormatRec;
    if (result.request.length) {
      const requestMatch = result.request.match(COMBINED_LINE_REQUEST_REGEX);
      if (requestMatch === null) {
        return new CombinedLogFormatError("RequestRegexDoesntMatch", line);
      } else {
        result = Object.assign(result, requestMatch.groups!);
      }
    }
    return result;
  }
}

//
// Implementation.
//

export const COMBINED_LINE_REGEX = new RegExp(
  [
    /^/,
    /(?<remote_addr>\S+) - /,
    /(?<remote_user>\S+) \[/,
    /(?<time_local_day>\d{2})\//,
    /(?<time_local_month>\w{3})\//,
    /(?<time_local_year>\d{4}):/,
    /(?<time_local_hour>\d{2}):/,
    /(?<time_local_minute>\d{2}):/,
    /(?<time_local_second>\d{2}) /,
    /(?<time_local_zone>[^\]]+)\] "/,
    /(?<request>[^"]*)" /,
    /(?<status>[0-9]{3}) /,
    /(?<body_bytes_sent>[0-9]+|-) "/,
    /(?<http_referer>[^"]*)" "/,
    /(?<http_user_agent>[^"]*)"/,
    /$/,
  ]
    .map((regexLine) => regexLine.source)
    .join("")
);

export const COMBINED_LINE_REQUEST_REGEX = new RegExp(
  [
    /^/,
    /(?<request_method>[A-Z]+) /,
    /(?<request_path>\S+) HTTP\//,
    /(?<request_http_version>[0-9.]+)/,
    /$/,
  ]
    .map((regexLine) => regexLine.source)
    .join("")
);

export class CombinedLogFormatError extends Error {
  name = "CombinedLogFormatError";
  line: string;
  constructor(message: CombinedLogFormatErrorMesage, line: string) {
    super(message);
    this.line = line;
  }
  toString() {
    return `${super.toString()} '${this.line}'`;
  }
}

export type CombinedLogFormatErrorMesage =
  | "LineEmpty"
  | "LineRegexDoesntMatch"
  | "RequestRegexDoesntMatch";

//
// Streams API support.
//

export class CombinedLogFormatStream extends TransformStream<
  string,
  CombinedLogFormatRec
> {
  constructor(
    args: { onError: CombinedLogFormatStreamErrorHandler } = {
      onError: (err) => {
        throw err;
      },
    }
  ) {
    super({
      transform(
        line: string,
        controller: TransformStreamDefaultController<CombinedLogFormatRec>
      ) {
        if (line.length !== 0) {
          const result = parseCombinedLogFormatLine(line);
          if (result instanceof CombinedLogFormatError) {
            if (!args.onError(result)) {
              controller.terminate();
            }
          } else {
            controller.enqueue(result);
          }
        }
      },
    });
  }
}

type CombinedLogFormatStreamErrorHandler = (
  err: CombinedLogFormatError
) => boolean;

/*
  Apache Combined Log Format
  ==========================

  LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\"" combined

  Refs:
  - https://httpd.apache.org/docs/2.4/logs.html#combined

  Nginx Combined Log Format
  =========================

  log_format combined '$remote_addr - $remote_user [$time_local] ' 
  '"$request" $status $body_bytes_sent ' 
  '"$http_referer" "$http_user_agent"';

  Refs:
  - https://nginx.org/en/docs/http/ngx_http_log_module.html
  - https://nginx.org/en/docs/http/ngx_http_core_module.html#variables
*/
