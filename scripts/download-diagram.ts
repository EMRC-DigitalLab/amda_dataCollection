
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

// Explicit path to the artifact based on previous context
const ARTIFACT_PATH = String.raw`C:\Users\JohnOssai\.gemini\antigravity\brain\3305e4d5-ef07-4d68-a3fd-8bda6856500d\system_architecture.md`;
const OUTPUT_PATH = path.join(process.cwd(), 'system_architecture.png');

const extractMermaid = (content: string): string | null => {
    // Handling potential CRLF issues by using \s+ which matches any whitespace including newlines
    const match = content.match(/```mermaid\s+([\s\S]*?)```/);
    return match ? match[1].trim() : null;
};

const downloadImage = (graphDefinition: string) => {
    // mermaid.ink simple encoding: base64
    const encoded = Buffer.from(graphDefinition).toString('base64');
    const url = `https://mermaid.ink/img/${encoded}?type=png&bgColor=white`;

    console.log(`Downloading diagram from: ${url}`);
    console.log(`Saving to: ${OUTPUT_PATH}`);

    const file = fs.createWriteStream(OUTPUT_PATH);

    https.get(url, (response) => {
        if (response.statusCode !== 200) {
            console.error(`Failed to download image. Status Code: ${response.statusCode}`);
            if (response.statusCode === 400 || response.statusCode === 414) {
                console.error("Graph might be too large for simple GET request.");
            }
            return;
        }
        response.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log('Download completed successfully.');
        });
    }).on('error', (err) => {
        fs.unlink(OUTPUT_PATH, () => {});
        console.error(`Error downloading file: ${err.message}`);
    });
};

try {
    if (!fs.existsSync(ARTIFACT_PATH)) {
        console.error(`Artifact file not found at: ${ARTIFACT_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(ARTIFACT_PATH, 'utf-8');
    const mermaidCode = extractMermaid(content);

    if (mermaidCode) {
        downloadImage(mermaidCode);
    } else {
        console.error('No mermaid diagram found in the artifact.');
    }
} catch (error) {
    console.error('An unexpected error occurred:', error);
}
