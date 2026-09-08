import styles from "./google-business-reviews.module.css";

const googleListing =
  "https://www.google.com/maps/place/iLLCo-Ai/data=!4m2!3m1!1s0x0:0x51ce446ac2f43c2b";

const reviews = [
  {
    name: "Pam Allton",
    rating: 5,
    text: "So happy with their product.",
  },
  {
    name: "shayla goriel",
    rating: 5,
    text: "5-star Google rating",
    ratingOnly: true,
  },
  {
    name: "little piggy’s",
    rating: 5,
    text: "they have been our go to for everything ai. most company’s don’t have exactly what we need and this…",
  },
];

export function GoogleBusinessReviews() {
  return (
    <section className={styles.section} aria-labelledby="google-reviews-title">
      <div className={styles.shell}>
        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>VERIFIED GOOGLE BUSINESS FEEDBACK</p>
            <h2 id="google-reviews-title">Real reviews. Public proof.</h2>
            <p className={styles.intro}>
              Recent feedback from the iLLCo-Ai Google Business Profile. No invented testimonials.
            </p>
          </div>
          <a className={styles.googleButton} href={googleListing} target="_blank" rel="noreferrer">
            View on Google ↗
          </a>
        </div>

        <div className={styles.summary}>
          <span className={styles.googleMark}>G</span>
          <div>
            <strong>Google Business Profile</strong>
            <span>3 verified 5-star review notifications · August 2026</span>
          </div>
          <div className={styles.summaryStars} aria-label="5 out of 5 stars">★★★★★</div>
        </div>

        <div className={styles.grid}>
          {reviews.map((review) => (
            <article className={styles.card} key={review.name}>
              <div className={styles.stars} aria-label={`${review.rating} out of 5 stars`}>
                {"★".repeat(review.rating)}
              </div>
              <blockquote className={review.ratingOnly ? styles.ratingOnly : undefined}>
                “{review.text}”
              </blockquote>
              <footer>
                <span className={styles.avatar}>{review.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{review.name}</strong>
                  <span>Google reviewer</span>
                </div>
              </footer>
            </article>
          ))}
        </div>

        <p className={styles.disclosure}>
          Review text is displayed from Google Business Profile notifications received by iLLCo-Ai. The third review is shown as the excerpt supplied by Google; Shayla left a star rating without written text.
        </p>
      </div>
    </section>
  );
}
