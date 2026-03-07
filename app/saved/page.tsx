import { SavedClips } from "@/components/saved-clips";

export default function SavedPage() {
  return (
    <main className="section-shell space-y-6 py-8">
      <div>
        <div className="eyebrow">Saved</div>
        <h1 className="display-font mt-4 text-4xl font-bold">
          {"\u6536\u85cf\u5939"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-black/70">
          {
            "\u628a\u9ad8\u4ef7\u503c\u5207\u7247\u6c89\u6dc0\u4e0b\u6765\uff0c\u4e4b\u540e\u53ef\u4ee5\u76f4\u63a5\u56de\u770b\u5207\u7247\u8be6\u60c5\u6216\u7ad9\u5185\u7eed\u64ad\u539f\u89c6\u9891\u3002"
          }
        </p>
      </div>
      <SavedClips />
    </main>
  );
}
