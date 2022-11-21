import {
  assert,
  assertInstanceOf,
  assertNotInstanceOf,
  assertStrictEquals,
} from "https://deno.land/std@0.165.0/testing/asserts.ts";
import { readableStreamFromIterable } from "https://deno.land/std@0.165.0/streams/mod.ts";
import {
  CombinedLogFormatError,
  parseCombinedLogFormatLine,
  CombinedLogFormatStream,
} from "./combined_log_format.ts";

Deno.test(function normal() {
  const line =
    '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326 "http://www.example.com/start.html" "Mozilla/4.08 [en] (Win98; I ;Nav)"';

  const result = parseCombinedLogFormatLine(line);
  if (result instanceof CombinedLogFormatError) {
    console.error(result);
    assertNotInstanceOf(result, CombinedLogFormatError);
  } else {
    assertStrictEquals(result.remote_addr, "127.0.0.1");
    assertStrictEquals(result.remote_user, "frank");
    assertStrictEquals(result.time_local_day, "10");
    assertStrictEquals(result.time_local_month, "Oct");
    assertStrictEquals(result.time_local_year, "2000");
    assertStrictEquals(result.time_local_hour, "13");
    assertStrictEquals(result.time_local_minute, "55");
    assertStrictEquals(result.time_local_second, "36");
    assertStrictEquals(result.time_local_zone, "-0700");
    assertStrictEquals(result.request, "GET /apache_pb.gif HTTP/1.0");
    assertStrictEquals(result.status, "200");
    assertStrictEquals(result.body_bytes_sent, "2326");
    assertStrictEquals(
      result.http_referer,
      "http://www.example.com/start.html"
    );
    assertStrictEquals(
      result.http_user_agent,
      "Mozilla/4.08 [en] (Win98; I ;Nav)"
    );
    assertStrictEquals(result.request_method, "GET");
    assertStrictEquals(result.request_path, "/apache_pb.gif");
    assertStrictEquals(result.request_http_version, "1.0");
  }
});

Deno.test(function minimal() {
  const line = '20.115.56.6 - - [04/Nov/2022:23:56:33 -0500] "" 400 0 "-" "-"';

  const result = parseCombinedLogFormatLine(line);
  if (result instanceof CombinedLogFormatError) {
    console.error(result);
    assertNotInstanceOf(result, CombinedLogFormatError);
  } else {
    assertStrictEquals(result.remote_addr, "20.115.56.6");
    assertStrictEquals(result.remote_user, "-");
    assertStrictEquals(result.time_local_day, "04");
    assertStrictEquals(result.time_local_month, "Nov");
    assertStrictEquals(result.time_local_year, "2022");
    assertStrictEquals(result.time_local_hour, "23");
    assertStrictEquals(result.time_local_minute, "56");
    assertStrictEquals(result.time_local_second, "33");
    assertStrictEquals(result.time_local_zone, "-0500");
    assertStrictEquals(result.request, "");
    assertStrictEquals(result.status, "400");
    assertStrictEquals(result.body_bytes_sent, "0");
    assertStrictEquals(result.http_referer, "-");
    assertStrictEquals(result.http_user_agent, "-");
  }
});

Deno.test(function emptyError() {
  const result = parseCombinedLogFormatLine("");
  assertInstanceOf(result, CombinedLogFormatError);
  if (result instanceof CombinedLogFormatError) {
    assertStrictEquals(result.message, "LineEmpty");
  }
});

Deno.test(function invalidLineError() {
  const result = parseCombinedLogFormatLine("nope");
  assertInstanceOf(result, CombinedLogFormatError);
  if (result instanceof CombinedLogFormatError) {
    assertStrictEquals(result.message, "LineRegexDoesntMatch");
  }
});

Deno.test(function invalidRequestError() {
  const line =
    '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "nope" 200 2326 "http://www.example.com/start.html" "Mozilla/4.08 [en] (Win98; I ;Nav)"';
  const result = parseCombinedLogFormatLine(line);
  assertInstanceOf(result, CombinedLogFormatError);
  if (result instanceof CombinedLogFormatError) {
    assertStrictEquals(result.message, "RequestRegexDoesntMatch");
  }
});

Deno.test(async function stream() {
  const lineStream = readableStreamFromIterable([
    '20.115.56.6 - - [04/Nov/2022:23:56:33 -0500] "" 400 0 "-" "-"',
  ]);
  const clfStream = lineStream.pipeThrough(new CombinedLogFormatStream());
  const clfReader = clfStream.getReader();
  const result = (await clfReader.read()).value!;

  assertStrictEquals(result.remote_addr, "20.115.56.6");
  assertStrictEquals(result.remote_user, "-");
  assertStrictEquals(result.time_local_day, "04");
  assertStrictEquals(result.time_local_month, "Nov");
  assertStrictEquals(result.time_local_year, "2022");
  assertStrictEquals(result.time_local_hour, "23");
  assertStrictEquals(result.time_local_minute, "56");
  assertStrictEquals(result.time_local_second, "33");
  assertStrictEquals(result.time_local_zone, "-0500");
  assertStrictEquals(result.request, "");
  assertStrictEquals(result.status, "400");
  assertStrictEquals(result.body_bytes_sent, "0");
  assertStrictEquals(result.http_referer, "-");
  assertStrictEquals(result.http_user_agent, "-");

  assert((await clfReader.read()).done);
  clfReader.releaseLock();
});
