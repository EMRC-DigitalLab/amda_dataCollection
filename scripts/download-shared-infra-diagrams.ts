
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

// Artifact path
const ARTIFACT_PATH = String.raw`C:\Users\JohnOssai\.gemini\antigravity\brain\3305e4d5-ef07-4d68-a3fd-8bda6856500d\shared_infrastructure.md`;

const downloadImage = (graphDefinition: string, filename: string) => {
    const encoded = Buffer.from(graphDefinition).toString('base64');
    const url = `https://mermaid.ink/img/${encoded}?type=png&bgColor=white`;
    const outputPath = path.join(process.cwd(), filename);

    console.log(`Downloading ${filename} from: ${url}`);

    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
        if (response.statusCode !== 200) {
            console.error(`Failed to download ${filename}. Status Code: ${response.statusCode}`);
            return;
        }
        response.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log(`Download of ${filename} completed successfully.`);
        });
    }).on('error', (err) => {
        fs.unlink(outputPath, () => {});
        console.error(`Error downloading ${filename}: ${err.message}`);
    });
};

try {
    if (!fs.existsSync(ARTIFACT_PATH)) {
        console.error(`Artifact file not found at: ${ARTIFACT_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(ARTIFACT_PATH, 'utf-8');

    // defined map of headers to filenames
    const diagrams = [
        {
            header: '### Tech Stack Diagram',
            filename: 'tech_stack_diagram.png'
        },
        {
            header: '### Integration Data Flow Diagram',
            filename: 'integration_data_flow_diagram.png'
        }
    ];

    diagrams.forEach(diag => {
        // Regex to find content after the header, capturing the mermaid block
        // Matches Header -> newlines -> ```mermaid -> content -> ```
        const regex = new RegExp(`${diag.header}\\s+([\\s\\S]*?)\`\`\`mermaid\\s+([\\s\\S]*?)\`\`\``, 'm');
        const match = content.match(regex);
        
        // If the header itself is immediately followed by the block (which it is appropriately in the file)
        // actually looking at the file:
        // ### Tech Stack Diagram
        // ```mermaid
        // so the regex should just be Header followed by whitespace then backticks
        
        const simpleRegex = new RegExp(`${diag.header}\\s+\`\`\`mermaid\\s+([\\s\\S]*?)\`\`\``);
        const simpleMatch = content.match(simpleRegex);

        if (simpleMatch && simpleMatch[1]) {
            console.log(`Found diagram for ${diag.header}`);
            downloadImage(simpleMatch[1].trim(), diag.filename);
        } else {
            console.error(`Could not find mermaid diagram for header: ${diag.header}`);
        }
    });

} catch (error) {
    console.error('An unexpected error occurred:', error);
}
