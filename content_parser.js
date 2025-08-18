async function loadContent() {
    try {
        const response = await fetch('data/training_content.md');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const markdownText = await response.text();
        
        const sections = markdownText.split(new RegExp('\\n---\\n', 'g'));

        const introContent = sections[0];
        const modulesBlock = sections[1];
        const conclusionContent = sections[2];

        const introContainer = document.getElementById('intro-content');
        if (introContainer) {
            const htmlContent = marked.parse(introContent.trim());
            introContainer.innerHTML = `<div class="prose max-w-4xl mx-auto text-center">${htmlContent}</div>`;
        }
        
        const conclusionContainer = document.getElementById('conclusion-content');
        if (conclusionContainer) {
            const htmlContent = marked.parse(conclusionContent.trim());
            conclusionContainer.innerHTML = `<div class="prose max-w-4xl mx-auto text-center">${htmlContent}</div>`;
        }

        const moduleRegex = new RegExp('#### (Módulo \\d+:.*?)([\\s\\S]*?)(?=\\n####|$)','g');
        let match;
        let moduleIndex = 1;
        while ((match = moduleRegex.exec(modulesBlock)) !== null) {
            const container = document.getElementById(`module-${moduleIndex}-content`);
            if (container) {
                const fullModuleMarkdown = `#### ${match[1]}${match[2]}`;
                const htmlContent = marked.parse(fullModuleMarkdown.trim());
                container.innerHTML = `<div class="prose max-w-none">${htmlContent}</div>`;
            }
            moduleIndex++;
        }
    } catch (error) {
        console.error('Error fetching or parsing markdown:', error);
        throw error;
    }
}

export { loadContent };
