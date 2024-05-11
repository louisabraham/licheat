from mitmproxy import http


def response(flow: http.HTTPFlow) -> None:
    # Check if the request URL matches the desired pattern
    if flow.request.url.startswith("https://lichess1.org/assets/compiled/site"):
        # Modify the JavaScript content
        modified_js_content = flow.response.content.replace(
            b"trustAllEvents:!1", b"trustAllEvents:!0"
        )

        # Set the modified content in the response
        flow.response.content = modified_js_content

        # Log the modification
        print("JavaScript file modified:", flow.request.url)
