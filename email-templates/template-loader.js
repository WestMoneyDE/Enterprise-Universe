/**
 * Email Template Loader
 * Loads and renders email templates from JSON definitions
 */

const fs = require('fs').promises;
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, 'templates');

// Cache for loaded templates
let templateCache = {};
let cacheLoaded = false;

/**
 * Load all templates from JSON files
 */
async function loadAllTemplates() {
    if (cacheLoaded) return templateCache;

    try {
        const files = await fs.readdir(TEMPLATES_DIR);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        for (const file of jsonFiles) {
            const filePath = path.join(TEMPLATES_DIR, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);

            // Index templates by ID
            if (data.templates) {
                for (const template of data.templates) {
                    templateCache[template.id] = {
                        ...template,
                        category: data.category,
                        language: data.language
                    };
                }
            }
        }

        cacheLoaded = true;
        console.log(`[TemplateLoader] Loaded ${Object.keys(templateCache).length} templates`);
        return templateCache;
    } catch (error) {
        console.error('[TemplateLoader] Error loading templates:', error.message);
        return {};
    }
}

/**
 * Get a template by ID
 */
async function getTemplate(templateId) {
    await loadAllTemplates();
    return templateCache[templateId] || null;
}

/**
 * Render a template with variables
 */
function renderTemplate(template, variables = {}) {
    if (!template) return null;

    let subject = template.subject || '';
    let body = template.body || '';

    // Replace {{variable}} placeholders
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value || '');
        body = body.replace(regex, value || '');
    }

    // Clean up any remaining unreplaced variables
    subject = subject.replace(/{{[^}]+}}/g, '');
    body = body.replace(/{{[^}]+}}/g, '');

    return { subject, body };
}

/**
 * Get and render a template in one call
 */
async function getRenderedTemplate(templateId, variables = {}) {
    const template = await getTemplate(templateId);
    if (!template) {
        console.warn(`[TemplateLoader] Template not found: ${templateId}`);
        return null;
    }
    return renderTemplate(template, variables);
}

/**
 * Get all templates by category
 */
async function getTemplatesByCategory(category) {
    await loadAllTemplates();
    return Object.values(templateCache).filter(t => t.category === category);
}

/**
 * Get all template categories
 */
async function getCategories() {
    await loadAllTemplates();
    const categories = new Set();
    Object.values(templateCache).forEach(t => categories.add(t.category));
    return Array.from(categories);
}

/**
 * List all available templates
 */
async function listTemplates() {
    await loadAllTemplates();
    return Object.entries(templateCache).map(([id, t]) => ({
        id,
        name: t.name,
        category: t.category,
        subject: t.subject,
        variables: t.variables || []
    }));
}

/**
 * Reload templates (clear cache)
 */
async function reloadTemplates() {
    templateCache = {};
    cacheLoaded = false;
    return await loadAllTemplates();
}

/**
 * Validate a template has all required variables
 */
function validateVariables(template, variables) {
    if (!template.variables) return { valid: true, missing: [] };

    const missing = template.variables.filter(v => !(v in variables));
    return {
        valid: missing.length === 0,
        missing
    };
}

module.exports = {
    loadAllTemplates,
    getTemplate,
    renderTemplate,
    getRenderedTemplate,
    getTemplatesByCategory,
    getCategories,
    listTemplates,
    reloadTemplates,
    validateVariables
};
