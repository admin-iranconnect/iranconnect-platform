import LegalLayout from "../components/LegalLayout";

const texts = {
  en: `
  <h1>About IranConnect</h1>
  <p><strong>IranConnect – Bridging Iranians Across Borders</strong></p>

  <p>IranConnect was created with one heartfelt mission — to help Iranians living abroad find trusted professionals from their own community.</p>

  <p>For many Iranians who have moved far from home, adapting to life in a new country can be overwhelming, especially when facing important moments that require reliable guidance — whether it’s seeking medical care, navigating legal matters, or finding a translator who truly understands both your language and your culture.</p>

  <p>IranConnect makes this journey easier by connecting you with Iranian professionals and service providers around the world — doctors, lawyers, translators, consultants, and many others — so that no Iranian ever feels alone when in need of help or advice.</p>

  <p>Beyond a simple directory, IranConnect is a community-driven platform built on trust, empathy, and cultural connection. Our goal is to reduce the emotional and practical stress of migration by making it effortless to find Iranian-run businesses and experts wherever you are.</p>

  <p>Through this network, we aim to strengthen the bonds between Iranians abroad and create a reliable bridge that connects hearts, knowledge, and experience — across every border.</p>
  `,

  fr: `
  <h1>À propos d’IranConnect</h1>
  <p><strong>IranConnect – Relier les Iraniens à travers les frontières</strong></p>

  <p>IranConnect a été créé avec une mission sincère : aider les Iraniens vivant à l’étranger à trouver des professionnels de confiance issus de leur propre communauté.</p>

  <p>Pour beaucoup d’Iraniens qui ont quitté leur pays, s’adapter à un nouvel environnement peut être difficile, surtout dans les moments importants nécessitant des conseils fiables — qu’il s’agisse de soins médicaux, de démarches juridiques ou de trouver un traducteur qui comprend véritablement votre langue et votre culture.</p>

  <p>IranConnect facilite ce parcours en mettant en relation les utilisateurs avec des professionnels iraniens du monde entier — médecins, avocats, traducteurs, consultants et bien d’autres — afin qu’aucun Iranien ne se sente seul lorsqu’il a besoin d’aide ou de conseils.</p>

  <p>Bien plus qu’un simple annuaire, IranConnect est une plateforme communautaire fondée sur la confiance, l’empathie et le lien culturel. Notre objectif est de réduire le stress émotionnel et pratique lié à la migration en facilitant l’accès à des experts iraniens où que vous soyez.</p>

  <p>À travers ce réseau, nous cherchons à renforcer les liens entre les Iraniens à l’étranger et à créer un pont fiable qui relie les cœurs, les connaissances et l’expérience — au-delà de toutes les frontières.</p>
  `,

  fa: `
  <h1>درباره ایران‌کانکت</h1>
  <p><strong>IranConnect – پلی میان ایرانیان در سراسر جهان</strong></p>

  <p>ایران‌کانکت با هدفی صمیمی راه‌اندازی شد: کمک به ایرانیان مقیم خارج از کشور برای یافتن متخصصان و خدمات مورد اعتماد از میان جامعه ایرانی.</p>

  <p>برای بسیاری از ایرانیانی که از وطن دور شده‌اند، سازگاری با زندگی در کشور جدید می‌تواند دشوار باشد، به‌ویژه در زمان‌هایی که نیاز به راهنمایی و همراهی مطمئن دارند — چه برای دریافت خدمات پزشکی، چه در امور حقوقی و یا یافتن مترجمی که فرهنگ و زبانشان را درک کند.</p>

  <p>ایران‌کانکت این مسیر را ساده‌تر می‌کند؛ با اتصال کاربران به پزشکان، وکلا، مترجمان و دیگر متخصصان ایرانی در سراسر جهان، تا هیچ ایرانی در زمان نیاز احساس تنهایی نکند.</p>

  <p>فراتر از یک دایرکتوری ساده، ایران‌کانکت بستری اجتماعی است مبتنی بر اعتماد، همدلی و پیوند فرهنگی. هدف ما کاهش فشارهای روحی و چالش‌های مهاجرت با ایجاد دسترسی آسان به متخصصان ایرانی در هر نقطه از جهان است.</p>

  <p>از طریق این شبکه، می‌خواهیم پلی مطمئن میان ایرانیان در سراسر دنیا بسازیم که دل‌ها، دانش و تجربه‌ها را به هم پیوند می‌دهد — فراتر از هر مرز.</p>
  `,
};

export default function AboutPage() {
  return <LegalLayout texts={texts} />;
}
