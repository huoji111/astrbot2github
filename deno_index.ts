async function handler(req: Request): Promise<Response> {
  const incomingUrl = new URL(req.url);
  if (incomingUrl.pathname === "/") {
    return new Response(
      "此地址只用于为astrbot提供更快速的github访问服务",
      {
        status: 200, // OK
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }
  // 1. 从请求路径中提取目标 URL
  const targetUrlString = decodeURIComponent(incomingUrl.pathname.slice(1));

  // 2. 验证提取出的字符串是否看起来像一个有效的 URL
  if (!targetUrlString || (!targetUrlString.startsWith("http://") && !targetUrlString.startsWith("https://"))) {
    return new Response("Invalid or missing target URL in path. Usage: /<target_url>", {
      status: 400, // Bad Request
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  console.log(`Proxying request to: ${targetUrlString}`); // 打印日志

  try {
    // 3. 使用提取出的目标 URL 发起 fetch 请求
    const response = await fetch(targetUrlString, {
      headers: req.headers, // 转发原始请求头
      method: req.method,   // 转发原始请求方法
      body: req.body,       // 转发原始请求体 (支持流式传输)
      redirect: 'manual',   // 不自动处理重定向
    });

    // 4. 返回从目标服务器获取的响应
    const responseHeaders = new Headers(response.headers); // 复制响应头以便修改
    responseHeaders.set("Access-Control-Allow-Origin", "*"); // 允许任何来源访问
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); // 允许的方法
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, *"); // 允许的请求头

    // 处理浏览器的 OPTIONS 预检请求
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204, // No Content
            headers: responseHeaders
        });
    }

    // 直接返回目标服务器的响应体、状态码和处理过的头信息
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    // 5. 处理 fetch 过程中可能发生的错误
    console.error(`Error fetching ${targetUrlString}:`, error);
    return new Response(`Failed to proxy request to ${targetUrlString}: ${error.message}`, {
      status: 502, // Bad Gateway
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

console.log("此地址只用于帮助astrbot更快的连接github");

// ✨ 修复核心：使用 Deno 内置的 Deno.serve，不再从 external 导入 serve。
// Deno Deploy 会自动接管端口并绑定 0.0.0.0
Deno.serve(handler);
