const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function testLlama() {
    // Updated paths to use the newly built llama-cli
    const modelPath = '/Users/foudamo/Fireflies project/models/llama-2-7b-chat.gguf';
    const llamaPath = '/Users/foudamo/Fireflies project/llama.cpp/build/bin/llama-cli';
    const promptFile = path.join(__dirname, 'temp_prompt.txt');

    try {
        // Verify paths exist
        await Promise.all([fs.access(modelPath), fs.access(llamaPath)]);
        console.log('✅ Model and CLI executable found');

        // Test prompt
        const prompt = `[INST]Please analyze this short text and extract any tasks:

Text to analyze:
Alice needs to prepare the quarterly report by next Friday. Bob will help with the financial data analysis.
Meanwhile, Charlie is responsible for updating the website content before Wednesday.

Format your response as JSON with this structure:
{
  "tasks": [
    {
      "assignee": "person name",
      "task": "task description",
      "deadline": "deadline if specified"
    }
  ]
}[/INST]`;

        // Write prompt to temporary file
        await fs.writeFile(promptFile, prompt, 'utf8');
        console.log('✅ Prompt file created');

        console.log('\nRunning Llama with test prompt...\n');

        // Run Llama with updated parameters
        const process = spawn(llamaPath, [
            '-m', modelPath,
            '-f', promptFile,
            '--ctx-size', '2048',
            '--batch-size', '512',
            '--threads', '4',
            '--n-predict', '2048',
            '--temp', '0.7',
            '--top-k', '40',
            '--top-p', '0.9',
            '--no-mmap',
            '--n-gpu-layers', '0',  // Force CPU-only mode
        ]);

        let output = '';
        let error = '';

        process.stdout.on('data', (data) => {
            const chunk = data.toString();
            output += chunk;
            console.log('Output chunk:', chunk);
        });

        process.stderr.on('data', (data) => {
            const chunk = data.toString();
            error += chunk;
            if (!chunk.includes('llama_print_timings')) {
                console.error('Error:', chunk);
            }
        });

        await new Promise((resolve, reject) => {
            process.on('close', (code) => {
                if (code !== 0) {
                    console.error('❌ Llama process error:', error);
                    reject(new Error(`Process exited with code ${code}`));
                    return;
                }

                console.log('\n✅ Llama process completed successfully');

                // Try to extract JSON from the output
                try {
                    const jsonMatch = output.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsedJson = JSON.parse(jsonMatch[0]);
                        console.log('\nParsed JSON output:', JSON.stringify(parsedJson, null, 2));
                        console.log('\n✅ JSON parsing successful');
                    } else {
                        console.log('\n❌ No JSON found in output');
                        console.log('Raw output:', output);
                    }
                } catch (err) {
                    console.error('\n❌ Error parsing JSON:', err);
                    console.log('Raw output:', output);
                }

                resolve();
            });

            process.on('error', (err) => {
                console.error('❌ Process error:', err);
                reject(err);
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        // Cleanup
        try {
            await fs.unlink(promptFile);
            console.log('\n✅ Cleaned up temporary files');
        } catch (error) {
            console.error('Warning: Could not delete temporary file:', error);
        }
    }
}

// Run the test
console.log('Starting Llama test...\n');
testLlama()
    .then(() => console.log('\nTest completed successfully'))
    .catch(error => {
        console.error('\nTest failed:', error);
        process.exit(1);
    });
