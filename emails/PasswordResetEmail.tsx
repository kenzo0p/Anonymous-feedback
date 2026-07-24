import {
  Html,
  Head,
  Font,
  Preview,
  Heading,
  Row,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  username: string;
  otp: string;
}

export default function PasswordResetEmail({
  username,
  otp,
}: PasswordResetEmailProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <title>Reset your Whistr password</title>
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
      <Preview>Your Whistr password reset code: {otp}</Preview>
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
          <Heading as="h2">Hello {username},</Heading>
        </Row>
        <Row>
          <Text>
            We received a request to reset your Whistr password. Use the code
            below to choose a new one:
          </Text>
        </Row>
        <Row>
          <Text style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "0.2em" }}>
            {otp}
          </Text>
        </Row>
        <Row>
          <Text>
            This code expires in 15 minutes. If you didn&apos;t request a reset,
            you can safely ignore this email — your password won&apos;t change.
          </Text>
        </Row>
      </Section>
    </Html>
  );
}
