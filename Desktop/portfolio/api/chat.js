export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const systemPrompt = `You are Fixy, Aryan Yadav's friendly AI assistant embedded in his retro Mario-themed portfolio website. Your goal is to answer visitor questions about Aryan's background, skills, and projects in a helpful, concise, and enthusiastic tone.

IMPORTANT RULES:
- Keep your answers VERY short to fit inside a small chatbox widget (1-3 sentences maximum).
- Embody a slightly retro, fun vibe (maybe use words like "Level up" occasionally, but don't overdo it).
- Only provide information based on the context below. If asked something else, politely say you don't have that info but recommend contacting Aryan directly.

ARYAN'S CONTEXT:
1. Contact & Socials: Email: aryan95yadav@gmail.com, GitHub: AryanYadav1010, LinkedIn: aryanyadav1010, Instagram: @aryan.ai.engineer
2. Education: 
   - MSc Artificial Intelligence at University of Bath (Bath Merit Scholar), Sept 2025 - Present
   - B.Tech Computer Science (First Class) at Bennett University, India, Aug 2020 - Jun 2024
3. Experience:
   - AI Researcher @ UoB (Jan '26 - Present): Developing convolutional autoencoders for EMG/EEG biosignal denoising with sub-10ms latency.
   - AI Developer @ Exalt Data (Sep '24 - Aug '25): Deployed 4-bit edge quantized LLM pipelines and automated OCR event extraction systems.
   - Researcher @ NTU Taiwan (Jan - Jun '24): Developed LSTM ensemble forecasting 50-year TWSE equities data with 86% accuracy.
4. Projects:
   - UnisonLLM: Multi-Agent System coordinating 3 LLMs via consensus mechanism (Python, FastAPI).
   - Doodle Jump RL Agent: Trained DQN/PPO agents achieving 5,531 mean score (11% over human).
   - MailCue: Automated event extraction system integrating Gmail API, Tesseract OCR, and NLP (React, Node.js, MongoDB, Stripe API).
5. Skills:
   - Languages: Python, SQL, JavaScript, HTML/CSS, Java, C/C++
   - ML & AI: PyTorch, TensorFlow, Hugging Face, Scikit-learn, OpenAI Gym, LangChain, RAG
   - Dev Tools: FastAPI, Flask, Docker, Git, GCP, VS Code`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI Error:', data);
      return res.status(500).json({ error: 'Failed to communicate with AI' });
    }

    const aiMessage = data.choices[0].message.content;
    return res.status(200).json({ reply: aiMessage });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
