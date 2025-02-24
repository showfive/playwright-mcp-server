# Playwright MCP Server

[![smithery badge](https://smithery.ai/badge/@showfive/playwright-mcp-server)](https://smithery.ai/server/@showfive/playwright-mcp-server)

English | [日本語](README.ja.md)

This project is a server that provides Playwright web page content retrieval functionality using the Model Context Protocol (MCP).

## Features

- Page navigation
- Full page content retrieval
- Visible content retrieval
- Interactive elements detection
- Mouse operation simulation
- Echo functionality for testing

## Installation

### Installing via Smithery

To install Playwright MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@showfive/playwright-mcp-server):

```bash
npx -y @smithery/cli install @showfive/playwright-mcp-server --client claude
```

### Manual Installation
```bash
npm install
```

## Usage

### Starting the Server

```bash
npm run build
npm start
```

### MCP Tools

The following tools are available:

1. `navigate`
   - Navigate to a specified URL
   - Arguments: `{ url: string }`
   - Returns: Navigation result

2. `get_all_content`
   - Retrieve content from the entire page
   - Arguments: None
   - Returns: All text content from the page

3. `get_visible_content`
   - Retrieve currently visible content
   - Arguments: `{ minVisiblePercentage?: number }`
   - Returns: Visible text content

4. `get_interactive_elements`
   - Get position information of interactive elements (buttons, links, etc.) on the page
   - Arguments: None
   - Returns: Coordinates and boundary information of interactive elements

5. `move_mouse`
   - Move mouse cursor to specified coordinates
   - Arguments: `{ x: number, y: number }`
   - Returns: Operation result

6. `mouse_click`
   - Execute mouse click at specified coordinates
   - Arguments: `{ x: number, y: number, button?: "left" | "right" | "middle", clickCount?: number }`
   - Returns: Click operation result

7. `mouse_wheel`
   - Execute mouse wheel scrolling
   - Arguments: `{ deltaY: number, deltaX?: number }`
   - Returns: Scroll operation result

8. `drag_and_drop`
   - Execute drag and drop operation
   - Arguments: `{ sourceX: number, sourceY: number, targetX: number, targetY: number }`
   - Returns: Drag and drop operation result

9. `echo`
   - Echo tool for testing
   - Arguments: `{ message: string }`
   - Returns: Sent message

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

- `tools/*.test.ts`: Function tests for each tool
- `mcp-server.test.ts`: MCP server function tests

## Implementation Features

1. Content Retrieval
   - Full page content retrieval
   - Visible content only retrieval
   - Proper HTML parsing

2. Interaction
   - Detection and position information retrieval of interactive elements
   - Mouse operation simulation (movement, clicks, scrolling)
   - Drag and drop support

3. Error Handling
   - Proper navigation error handling
   - Timeout processing
   - Invalid URL detection

4. Configuration Flexibility
   - Headless/head mode selection
   - Custom user agent
   - Viewport size settings

## Important Notes

- Ensure necessary environment variables are set before using the MCP server
- Follow the terms of service of target websites when retrieving web page content
- Maintain appropriate intervals when sending multiple requests
- When performing mouse operations, maintain appropriate intervals as they simulate actual user interactions

## License

ISC
