import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Sparkles, Dumbbell, Mail, ShieldAlert, Award } from "lucide-react-native";

import {
  Button,
  FormField,
  Badge,
  SportTag,
  Avatar,
  Card,
  EmptyState,
} from "@/src/components/ui";
import { colors, fonts, spacing, typography } from "@/src/theme/tokens";

export default function DesignSystemModal() {
  const [sampleText, setSampleText] = useState("");
  const [samplePassword, setSamplePassword] = useState("");
  const [buttonLoading, setButtonLoading] = useState(false);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Badge tone="primary">Design System v2</Badge>
          <Badge tone="success">React Native Expo</Badge>
        </View>
        <Text style={styles.title}>Galeria de Componentes</Text>
        <Text style={styles.subtitle}>
          Tokens oficiais e componentes construídos para o Gymnasion Mobile
        </Text>
      </View>

      {/* 1. Botões */}
      <Card variant="elevated" padding="lg" style={styles.section}>
        <Text style={styles.sectionTitle}>1. Buttons (Variantes & Estados)</Text>
        <View style={styles.componentStack}>
          <Button
            title="Primary Button"
            variant="primary"
            icon={<Sparkles size={16} color={colors.surface} />}
          />
          <Button
            title="Secondary Button"
            variant="secondary"
            icon={<Award size={16} color={colors.primary[600]} />}
          />
          <Button
            title={buttonLoading ? "Carregando..." : "Testar Loading State"}
            variant="ghost"
            loading={buttonLoading}
            onPress={() => {
              setButtonLoading(true);
              setTimeout(() => setButtonLoading(false), 2000);
            }}
          />
          <Button
            title="Danger Button"
            variant="danger"
            icon={<ShieldAlert size={16} color={colors.danger.dark} />}
          />
        </View>
      </Card>

      {/* 2. Badges */}
      <Card variant="elevated" padding="lg" style={styles.section}>
        <Text style={styles.sectionTitle}>2. Badges Semânticos</Text>
        <View style={styles.tagWrap}>
          <Badge tone="success">Concluído</Badge>
          <Badge tone="warning">Pendente</Badge>
          <Badge tone="danger">Atrasado</Badge>
          <Badge tone="info">Em andamento</Badge>
          <Badge tone="primary">Destaque</Badge>
          <Badge tone="neutral">Descontinuado</Badge>
        </View>
      </Card>

      {/* 3. SportTags */}
      <Card variant="elevated" padding="lg" style={styles.section}>
        <Text style={styles.sectionTitle}>3. SportTags (6 Modalidades Oficiais)</Text>
        <View style={styles.tagWrap}>
          <SportTag sport="Natação" />
          <SportTag sport="Tênis" />
          <SportTag sport="Academia" />
          <SportTag sport="Corrida" />
          <SportTag sport="Ciclismo" />
          <SportTag sport="Funcional" />
        </View>
      </Card>

      {/* 4. Avatares */}
      <Card variant="elevated" padding="lg" style={styles.section}>
        <Text style={styles.sectionTitle}>4. Avatares (Iniciais & Cores)</Text>
        <View style={styles.avatarRow}>
          <Avatar name="Amanda Souza" tone="primary" size="lg" />
          <Avatar name="Rafael Costa" tone="info" size="md" />
          <Avatar name="Carlos Eduardo" tone="primary" size="sm" />
        </View>
      </Card>

      {/* 5. FormFields */}
      <Card variant="elevated" padding="lg" style={styles.section}>
        <Text style={styles.sectionTitle}>5. FormFields (Validações & Ícones)</Text>
        <FormField
          label="Nome Completo"
          placeholder="Ex: João da Silva"
          value={sampleText}
          onChangeText={setSampleText}
          hint="Digite seu nome cadastrado na academia"
        />
        <FormField
          label="E-mail com Validação"
          placeholder="email@exemplo.com"
          leftIcon={<Mail size={18} color={colors.ink[400]} />}
          error="Este endereço de e-mail é inválido."
        />
        <FormField
          label="Senha com Toggle de Visibilidade"
          placeholder="Sua senha secreta"
          isPassword
          value={samplePassword}
          onChangeText={setSamplePassword}
        />
      </Card>

      {/* 6. EmptyState */}
      <Card variant="outlined" padding="none" style={styles.section}>
        <EmptyState
          icon={Dumbbell}
          title="Nenhum treino agendado"
          description="Você completou todas as tarefas da semana. Converse com seu personal trainer para planejar novos treinos."
          actionLabel="Ver histórico completo"
          onAction={() => {}}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    marginBottom: spacing.lg,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: typography.sizes.title1,
    color: colors.ink[900],
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: typography.sizes.body,
    color: colors.ink[500],
    marginTop: 4,
  },
  section: {
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: typography.sizes.cardTitle,
    color: colors.ink[900],
    marginBottom: spacing.md,
  },
  componentStack: {
    gap: spacing.sm,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.base,
  },
});
