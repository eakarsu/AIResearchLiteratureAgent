const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function seed() {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(`INSERT INTO users (email, password, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`, ['admin@example.com', hash, 'Admin']);

  const papers = [
    { title: 'Attention Is All You Need', authors: 'Vaswani, Shazeer, Parmar et al.', abstract: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.', source: 'arXiv', year: 2017, citations: 95000, doi: '10.48550/arXiv.1706.03762', tags: 'transformer,attention,NLP', status: 'read', relevance: 9.8 },
    { title: 'BERT: Pre-training of Deep Bidirectional Transformers', authors: 'Devlin, Chang, Lee, Toutanova', abstract: 'We introduce BERT, designed to pre-train deep bidirectional representations.', source: 'arXiv', year: 2018, citations: 75000, doi: '10.48550/arXiv.1810.04805', tags: 'BERT,NLP,pre-training', status: 'read', relevance: 9.5 },
    { title: 'GPT-4 Technical Report', authors: 'OpenAI', abstract: 'We report the development of GPT-4, a large-scale, multimodal model.', source: 'arXiv', year: 2023, citations: 5000, doi: '10.48550/arXiv.2303.08774', tags: 'GPT,LLM,multimodal', status: 'read', relevance: 9.2 },
    { title: 'ImageNet Classification with Deep CNNs', authors: 'Krizhevsky, Sutskever, Hinton', abstract: 'We trained a large, deep CNN to classify ImageNet images into 1000 different classes.', source: 'NeurIPS', year: 2012, citations: 120000, tags: 'CNN,ImageNet,deep learning', status: 'read', relevance: 8.5 },
    { title: 'Generative Adversarial Networks', authors: 'Goodfellow et al.', abstract: 'We propose a new framework for estimating generative models via an adversarial process.', source: 'NeurIPS', year: 2014, citations: 60000, tags: 'GAN,generative,adversarial', status: 'read', relevance: 8.8 },
    { title: 'Deep Residual Learning for Image Recognition', authors: 'He, Zhang, Ren, Sun', abstract: 'We present a residual learning framework to ease the training of very deep networks.', source: 'CVPR', year: 2015, citations: 170000, tags: 'ResNet,residual,deep learning', status: 'read', relevance: 9.0 },
    { title: 'DALL-E 2: Hierarchical Text-Conditional Image Generation', authors: 'Ramesh et al.', abstract: 'We present DALL-E 2, a system that can create realistic images from text descriptions.', source: 'arXiv', year: 2022, citations: 3000, tags: 'DALL-E,image generation,CLIP', status: 'reading', relevance: 8.7 },
    { title: 'AlphaFold: Protein Structure Prediction', authors: 'Jumper et al.', abstract: 'We describe AlphaFold, an AI system that predicts protein 3D structure from amino acid sequence.', source: 'Nature', year: 2021, citations: 20000, tags: 'protein,biology,structure prediction', status: 'read', relevance: 9.6 },
    { title: 'Scaling Laws for Neural Language Models', authors: 'Kaplan et al.', abstract: 'We study empirical scaling laws for language model performance on the cross-entropy loss.', source: 'arXiv', year: 2020, citations: 4500, tags: 'scaling laws,LLM,training', status: 'reading', relevance: 8.9 },
    { title: 'Chain-of-Thought Prompting Elicits Reasoning', authors: 'Wei et al.', abstract: 'We explore how chain-of-thought prompting enables complex reasoning in language models.', source: 'NeurIPS', year: 2022, citations: 6000, tags: 'prompting,reasoning,CoT', status: 'read', relevance: 9.1 },
    { title: 'Diffusion Models Beat GANs on Image Synthesis', authors: 'Dhariwal, Nichol', abstract: 'We show that diffusion models can achieve image sample quality superior to GANs.', source: 'NeurIPS', year: 2021, citations: 8000, tags: 'diffusion,generative,image synthesis', status: 'unread', relevance: 8.6 },
    { title: 'LoRA: Low-Rank Adaptation of Large Language Models', authors: 'Hu et al.', abstract: 'We propose LoRA, which freezes the pre-trained model weights and injects trainable rank decomposition matrices.', source: 'ICLR', year: 2022, citations: 7500, tags: 'LoRA,fine-tuning,efficiency', status: 'read', relevance: 9.0 },
    { title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP', authors: 'Lewis et al.', abstract: 'We explore retrieval-augmented generation models that combine pre-trained parametric and non-parametric memory.', source: 'NeurIPS', year: 2020, citations: 5500, tags: 'RAG,retrieval,knowledge', status: 'reading', relevance: 9.3 },
    { title: 'Constitutional AI: Harmlessness from AI Feedback', authors: 'Bai et al.', abstract: 'We propose Constitutional AI (CAI), a method for training harmless AI assistants.', source: 'arXiv', year: 2022, citations: 2000, tags: 'alignment,safety,RLHF', status: 'unread', relevance: 8.4 },
    { title: 'Flash Attention: Fast and Memory-Efficient Attention', authors: 'Dao et al.', abstract: 'We propose FlashAttention, an IO-aware exact attention algorithm that reduces memory usage.', source: 'NeurIPS', year: 2022, citations: 4000, tags: 'attention,efficiency,GPU', status: 'read', relevance: 8.8 },
    { title: 'Language Models are Few-Shot Learners', authors: 'Brown et al.', abstract: 'We show that scaling up language models greatly improves few-shot performance.', source: 'NeurIPS', year: 2020, citations: 35000, tags: 'GPT-3,few-shot,in-context learning', status: 'read', relevance: 9.7 },
  ];

  for (const p of papers) {
    await pool.query('INSERT INTO papers (title,authors,abstract,source,year,citations,doi,tags,status,relevance_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [p.title, p.authors, p.abstract, p.source, p.year, p.citations, p.doi || null, p.tags, p.status, p.relevance]);
  }

  const collections = [
    { name: 'Transformer Architecture', desc: 'Papers on transformer models and attention mechanisms', count: 6 },
    { name: 'Generative AI', desc: 'Papers on image and text generation', count: 4 },
    { name: 'AI Safety & Alignment', desc: 'Papers on making AI systems safe and aligned', count: 3 },
    { name: 'Efficient Training', desc: 'Papers on efficient model training and fine-tuning', count: 4 },
  ];
  for (const c of collections) {
    await pool.query('INSERT INTO collections (name,description,paper_count) VALUES ($1,$2,$3)', [c.name, c.desc, c.count]);
  }

  const reviews = [
    { title: 'Survey of Large Language Models', topic: 'LLM architectures, training, and applications', status: 'published', papers: 8, content: 'Comprehensive survey covering transformer architectures from GPT to modern LLMs.' },
    { title: 'Generative AI: State of the Art', topic: 'Text and image generation methods', status: 'draft', papers: 5, content: 'Review of GAN, diffusion model, and autoregressive approaches.' },
    { title: 'AI Alignment Research Gaps', topic: 'Safety and alignment in AI systems', status: 'in_progress', papers: 3, gaps: 'Lack of formal verification methods, insufficient testing on edge cases' },
  ];
  for (const r of reviews) {
    await pool.query('INSERT INTO reviews (title,topic,status,papers_included,content,gaps_identified) VALUES ($1,$2,$3,$4,$5,$6)', [r.title, r.topic, r.status, r.papers, r.content, r.gaps || null]);
  }

  console.log('✅ Seed complete'); process.exit(0);
}
seed().catch(e => { console.error(e); process.exit(1); });
