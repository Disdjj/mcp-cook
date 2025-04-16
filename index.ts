#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { promises as fs, existsSync } from "fs";
import * as path from "path";
import { z } from "zod";
import { fileURLToPath } from "url";

// Determine the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the dishes directory relative to the built index.js
// This assumes the 'dishes' folder is copied next to the compiled index.js in the build directory
const dishesDir = path.join(__dirname, "dishes");

// Create server instance
const server = new McpServer({
  name: "mcp-cook",
  version: "0.1.0",
  description: "An MCP service for providing dish information.",
});

// Tool to get all dish names
server.tool(
  "get_all_dishes",
  "获取所有可用菜品的名称列表 (菜单)。",
  {},
  async () => {
    try {
      // Check if dishes directory exists
      if (!existsSync(dishesDir)) {
        console.error(`Dishes directory not found at: ${dishesDir}`);
        return {
          content: [
            {
              type: "text",
              text: `错误：菜品目录未找到。请确保 \'dishes\' 目录已在构建过程中被正确复制。 expected path: ${dishesDir}`,
            },
          ],
        };
      }

      const files = await fs.readdir(dishesDir);
      const dishNames = files
        .filter((file: string) => file.endsWith(".md"))
        .map((file: string) => path.basename(file, ".md"));

      return {
        content: [
          {
            type: "text",
            text: `可用菜品 (${dishNames.length} 项):\n${dishNames.join("\n")}`,
          },
        ],
        // Optionally return data structure for programmatic use
        data: { dishes: dishNames },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("获取菜品列表时出错:", errorMessage);
      return {
        content: [
          {
            type: "text",
            text: `获取菜品列表时出错: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Input schema for get_dish_content

// Tool to get the content of a specific dish
server.tool(
  "get_dish_content",
  "根据提供的菜品名称获取其详细内容。",
  {
    dishName: z.string().describe("要获取内容的菜品名称 (例如 '麻婆豆腐')"),
  },
  async ({ dishName }) => {
    // Basic sanitization to prevent path traversal
    const safeDishName = path
      .normalize(dishName)
      .replace(/^(\.\.(\/|\\|$))+/, "");
    if (safeDishName !== dishName || safeDishName.includes("..")) {
      console.error(
        `Attempted path traversal or invalid characters: ${dishName}`
      );
      return {
        content: [
          {
            type: "text",
            text: "错误：无效的菜品名称。",
          },
        ],
      };
    }
    const filePath = path.join(dishesDir, `${safeDishName}.md`);

    try {
      if (!existsSync(filePath)) {
        console.error(`Dish file not found: ${filePath}`);
        return {
          content: [
            {
              type: "text",
              text: `错误：找不到菜品 \'${safeDishName}\'。请确保名称正确且文件存在于 \'dishes\' 目录中。`,
            },
          ],
        };
      }
      const content = await fs.readFile(filePath, "utf-8");
      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
        // Optionally return data structure
        data: { dishName: safeDishName, content: content },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`获取菜品 \'${safeDishName}\' 内容时出错:`, errorMessage);
      return {
        content: [
          {
            type: "text",
            text: `获取菜品 \'${safeDishName}\' 内容时出错: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
