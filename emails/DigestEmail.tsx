import {
  Html,
  Head,
  Font,
  Preview,
  Heading,
  Row,
  Section,
  Text,
  Button,
} from "@react-email/components";

interface DigestEmailProps {
  username: string;
  count: number;
  dashboardUrl: string;
}

export default function DigestEmail({
  username,
  count,
  dashboardUrl,
}: DigestEmailProps) {
  const plural = count === 1 ? "message" : "messages";
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <title>Your Whistr digest</title>
        <Font
          fontFamily="Roboto"
          fallbackFontFamily="Verdana"
          webFont={{
            url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{`You have ${count} new anonymous ${plural} on Whistr`}</Preview>
      <Section>
        <Row>
          <Text
            style={{
              fontWeight: 700,
              letterSpacing: "-0.01em",
              fontSize: "18px",
              margin: "0 0 8px",
            }}
          >
            Whistr
          </Text>
        </Row>
        <Row>
          <Heading as="h2">Hi {username},</Heading>
        </Row>
        <Row>
          <Text>
            You&apos;ve received <strong>{count}</strong> new anonymous {plural}{" "}
            since your last digest. Head to your dashboard to read them.
          </Text>
        </Row>
        <Row>
          <Button
            href={dashboardUrl}
            style={{
              background: "#0A0A0A",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Read your messages
          </Button>
        </Row>
        <Row>
          <Text style={{ color: "#666", fontSize: "12px", marginTop: "16px" }}>
            You can turn off these emails anytime in your Whistr settings.
          </Text>
        </Row>
      </Section>
    </Html>
  );
}
