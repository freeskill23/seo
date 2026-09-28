const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProductData {
  product_name: string;
  primary_keyword: string | null;
  category: string | null;
  price: number | null;
  brand: string | null;
  manufacturer: string | null;
  review_count: number;
  rating: number;
  shipping: string | null;
  attributes: Record<string, string>;
}

interface CompetitorData {
  product_name: string;
  price: number | null;
  review_count: number;
  rating: number;
  shipping: string | null;
  observed_rank: number | null;
}

interface SeoAnalysisData {
  total_score: number;
  title_score: number;
  category_score: number;
  brand_score: number;
  attribute_score: number;
  price_score: number;
  review_score: number;
  shipping_score: number;
  completeness_score: number;
}

interface AnalysisRequest {
  product: ProductData;
  keywords: string[];
  competitors: CompetitorData[];
  seoAnalysis: SeoAnalysisData | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: AnalysisRequest = await req.json();
    const { product, keywords, competitors, seoAnalysis } = body;

    if (!product) {
      return new Response(
        JSON.stringify({ error: "상품 데이터가 필요합니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (openaiApiKey) {
      const top10 = competitors.slice(0, 10);
      const avgPrice = top10.length > 0 ? Math.round(top10.reduce((s, c) => s + (c.price || 0), 0) / top10.length) : 0;
      const avgReviews = top10.length > 0 ? Math.round(top10.reduce((s, c) => s + (c.review_count || 0), 0) / top10.length) : 0;

      const prompt = `다음 네이버 쇼핑 상품 데이터를 분석하여 병목 요소와 강점을 파악해주세요.

상품 정보:
- 상품명: ${product.product_name}
- 대표 키워드: ${product.primary_keyword || '없음'}
- 카테고리: ${product.category || '없음'}
- 가격: ${product.price || '없음'}원
- 브랜드: ${product.brand || '없음'}
- 리뷰수: ${product.review_count}
- 평점: ${product.rating}
- 배송: ${product.shipping || '없음'}

추적 키워드: ${keywords.join(', ')}

SEO 자체진단 점수: ${seoAnalysis?.total_score || '없음'}/100
- 상품명: ${seoAnalysis?.title_score || 0}
- 카테고리: ${seoAnalysis?.category_score || 0}
- 브랜드: ${seoAnalysis?.brand_score || 0}
- 속성: ${seoAnalysis?.attribute_score || 0}
- 가격: ${seoAnalysis?.price_score || 0}
- 리뷰: ${seoAnalysis?.review_score || 0}
- 배송: ${seoAnalysis?.shipping_score || 0}
- 완성도: ${seoAnalysis?.completeness_score || 0}

경쟁상품 TOP10 평균:
- 가격: ${avgPrice}원
- 리뷰수: ${avgReviews}개

다음 형식으로 분석해주세요:

1. 현재 가장 큰 병목 (최대 3개)
2. 현재 강점
3. 오늘 해야 할 일 (최대 5개, 중요도 표시)

주의사항:
- 이 분석은 참고자료입니다.
- 인과관계를 단정하지 마세요.
- 네이버 공식 점수가 아닌 자체 진단 기준입니다.
- 순위 조작이나 자동화 방법은 절대 제안하지 마세요.
- 합법적인 SEO 개선 방법만 제안하세요.`;

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "너는 네이버 쇼핑 SEO 분석 전문가야. 한국어로 답변하고, 합법적인 개선 방법만 제안해." },
            { role: "user", content: prompt },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (openaiRes.ok) {
        const openaiData = await openaiRes.json();
        const analysis = openaiData.choices?.[0]?.message?.content || "분석을 완료했습니다.";
        return new Response(
          JSON.stringify({ analysis }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fallback: rule-based analysis when no API key or API failure
    const top10 = competitors.slice(0, 10);
    const avgPrice = top10.length > 0 ? Math.round(top10.reduce((s, c) => s + (c.price || 0), 0) / top10.length) : 0;
    const avgReviews = top10.length > 0 ? Math.round(top10.reduce((s, c) => s + (c.review_count || 0), 0) / top10.length) : 0;

    const bottlenecks: string[] = [];
    const strengths: string[] = [];
    const tasks: string[] = [];

    // Review analysis
    if (product.review_count < avgReviews * 0.5) {
      bottlenecks.push(`1. 리뷰 경쟁력\n   내 상품: ${product.review_count}개\n   TOP10 평균: ${avgReviews}개`);
      tasks.push("리뷰 수 증가를 위한 고객 응대 개선");
    }

    // Price analysis
    if (product.price && avgPrice && product.price > avgPrice * 1.1) {
      const diff = Math.round(((product.price - avgPrice) / avgPrice) * 100);
      bottlenecks.push(`2. 가격 경쟁력\n   내 상품 가격이 TOP10 평균보다 ${diff}% 높음`);
      tasks.push("경쟁상품 가격 대비 가격 경쟁력 검토");
    }

    // Attribute analysis
    if (seoAnalysis && seoAnalysis.attribute_score < 60) {
      bottlenecks.push(`3. 상품 속성\n   필수 속성 중 일부 미등록 가능성`);
      tasks.push("미등록 상품속성 확인 및 입력");
    }

    // Strengths
    if (/무료/.test(product.shipping || '')) {
      strengths.push("무료배송");
    }
    if (product.rating >= 4.5) {
      strengths.push("평점");
    }
    if (product.brand) {
      strengths.push("브랜드 인지도");
    }
    if (seoAnalysis && seoAnalysis.title_score >= 80) {
      strengths.push("상품명 최적화");
    }

    // Tasks from SEO scores
    if (seoAnalysis && seoAnalysis.title_score < 70) {
      tasks.push("상품명 키워드 구성 점검");
    }
    if (seoAnalysis && seoAnalysis.completeness_score < 70) {
      tasks.push("상품정보 입력 완성도 개선");
    }
    if (seoAnalysis && seoAnalysis.category_score < 70) {
      tasks.push("카테고리 적합성 확인");
    }

    while (tasks.length < 3) {
      tasks.push("경쟁상품 동향 지속 모니터링");
    }

    const analysis = `현재 가장 큰 병목

${bottlenecks.length > 0 ? bottlenecks.join('\n\n') : '특별한 병목 요소가 발견되지 않았습니다.'}

현재 강점

${strengths.length > 0 ? strengths.join('\n') : '분석 중입니다.'}

오늘 해야 할 일 (최대 5개)

${tasks.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}

---
본 분석은 참고자료입니다. 점수는 자체 진단 기준이며 네이버 공식 점수가 아닙니다.
인과관계를 단정하지 않으며, 합법적인 개선 방법만 제안합니다.`;

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "분석 중 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
