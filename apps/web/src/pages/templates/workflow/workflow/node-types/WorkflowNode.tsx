import styled from '@emotion/styled';
import { Group, Center, useMantineColorScheme, ActionIcon, Container, Stack, Divider } from '@mantine/core';
import { ChannelTypeEnum, providers, StepTypeEnum } from '@novu/shared';
import React, { MouseEventHandler, useEffect, useState } from 'react';
import { useViewport } from 'react-flow-renderer';
import { useFormContext } from 'react-hook-form';

import { useSegment } from '../../../../../components/providers/SegmentProvider';
import { When } from '../../../../../components/utils/When';
import { CONTEXT_PATH } from '../../../../../config';
import { Dropdown, Switch, Text, Tooltip, colors, Button } from '../../../../../design-system';
import {
  ConditionPlus,
  ConditionsFile,
  DotsHorizontal,
  PencilOutlined,
  ProviderMissing,
  Trash,
  VariantPlus,
  VariantsFile,
} from '../../../../../design-system/icons';
import { useStyles } from '../../../../../design-system/template-button/TemplateButton.styles';
import {
  useEnvController,
  useGetPrimaryIntegration,
  useHasActiveIntegrations,
  useIsMultiProviderConfigurationEnabled,
} from '../../../../../hooks';
import { CHANNEL_TYPE_TO_STRING } from '../../../../../utils/channels';
import { useSelectPrimaryIntegrationModal } from '../../../../integrations/components/multi-provider/useSelectPrimaryIntegrationModal';
import { IntegrationsListModal } from '../../../../integrations/IntegrationsListModal';
import { IntegrationsStoreModal } from '../../../../integrations/IntegrationsStoreModal';
import { TemplateEditorAnalyticsEnum } from '../../../constants';
import { getFormattedStepErrors } from '../../../shared/errors';
import { DisplayPrimaryProviderIcon } from '../../DisplayPrimaryProviderIcon';
import { NodeErrorPopover } from '../../NodeErrorPopover';

interface ITemplateButtonProps {
  Icon: React.FC<any>;
  label: string;
  active?: boolean;
  action?: boolean;
  testId?: string;
  tabKey?: ChannelTypeEnum;
  channelType: StepTypeEnum;
  checked?: boolean;
  readonly?: boolean;
  switchButton?: (boolean) => void;
  changeTab?: (string) => void;
  errors?: boolean | string;
  showDelete?: boolean;
  id?: string;
  index?: number;
  onDelete?: () => void;
  onAddVariant?: () => void;
  onEdit?: MouseEventHandler<HTMLButtonElement>;
  dragging?: boolean;
  disabled?: boolean;
  variantsCount?: number;
  subtitle?: string | React.ReactNode;
}

const MENU_CLICK_OUTSIDE_EVENTS = ['click', 'mousedown', 'touchstart'];

export function WorkflowNode({
  active = false,
  action = false,
  switchButton,
  checked = false,
  readonly = false,
  label,
  Icon,
  tabKey,
  channelType,
  index,
  testId,
  errors: initialErrors = false,
  showDelete = true,
  variantsCount = 0,
  id = undefined,
  onDelete = () => {},
  onAddVariant = () => {},
  onEdit = () => {},
  dragging = false,
  disabled: initDisabled,
  subtitle,
}: ITemplateButtonProps) {
  const segment = useSegment();

  const { readonly: readonlyEnv, environment } = useEnvController();
  const { cx, classes, theme } = useStyles();
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [disabled, setDisabled] = useState(initDisabled);
  const [isIntegrationsModalVisible, setIntegrationsModalVisible] = useState(false);
  const disabledColor = disabled ? { color: theme.colorScheme === 'dark' ? colors.B40 : colors.B70 } : {};
  const disabledProp = disabled ? { disabled: disabled } : {};
  const conditionsCount = 7;
  const isVariant = variantsCount > 0;

  const viewport = useViewport();
  const channelKey = tabKey ?? '';
  const [hover, setHover] = useState(false);
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();
  const { colorScheme } = useMantineColorScheme();
  const { openModal: openSelectPrimaryIntegrationModal, SelectPrimaryIntegrationModal } =
    useSelectPrimaryIntegrationModal();

  const { hasActiveIntegration, isChannelStep, activeIntegrationsByEnv } = useHasActiveIntegrations({
    filterByEnv: true,
    channelType: channelType as unknown as ChannelTypeEnum,
  });
  const { primaryIntegration, isPrimaryStep } = useGetPrimaryIntegration({
    filterByEnv: true,
    channelType: channelType as unknown as ChannelTypeEnum,
  });

  const onIntegrationModalClose = () => {
    setIntegrationsModalVisible(false);
    setPopoverOpened(false);
  };

  const {
    watch,
    formState: { errors },
  } = useFormContext();

  let stepErrorContent = initialErrors;

  if (typeof index === 'number') {
    stepErrorContent = getFormattedStepErrors(index, errors);
  }

  const showMenu = showDelete && !readonlyEnv && !dragging && hover;

  useEffect(() => {
    const subscription = watch((values) => {
      const thisStep = values.steps.find((step) => step._id === id);

      if (thisStep) {
        setDisabled(!thisStep.active);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, id]);

  const providerIntegration = isPrimaryStep
    ? primaryIntegration
    : activeIntegrationsByEnv?.find((integration) => integration.channel === channelKey)?.providerId;

  const provider = providers.find((_provider) => _provider.id === providerIntegration);

  const logoSrc = provider && `${CONTEXT_PATH}/static/images/providers/${colorScheme}/square/${provider?.id}.svg`;

  return (
    <>
      <UnstyledButtonStyled
        role={'button'}
        onMouseEnter={() => {
          setPopoverOpened(true);
          setHover(true);
        }}
        onMouseLeave={() => {
          setPopoverOpened(false);
          setHover(false);
        }}
        data-test-id={testId}
        className={cx(classes.button, { [classes.active]: active }, { [classes.variant]: isVariant })}
      >
        <Stack
          style={{
            flex: '1 1 auto',
          }}
          spacing={0}
        >
          <When truthy={isVariant}>
            <div className={classes.header}>
              <Group h={30} align={'center'}>
                <IconText
                  color={colors.B60}
                  Icon={VariantsFile}
                  label={
                    <>
                      {variantsCount} <span style={{ fontSize: '12px' }}>variants</span>
                    </>
                  }
                />
                <ContainerButton>
                  <When truthy={!showMenu && conditionsCount > 0}>
                    <IconText color={colors.B60} Icon={ConditionsFile} label={conditionsCount} />
                  </When>
                  <When truthy={showMenu}>
                    <Group noWrap spacing={5}>
                      <ActionIconWithTooltip onClick={onEdit} label={'Edit root step'}>
                        <PencilOutlined />
                      </ActionIconWithTooltip>
                      <ActionIconWithTooltip
                        onClick={(e) => e.stopPropagation()}
                        label={`${conditionsCount > 0 ? 'Edit' : 'Add'} group conditions`}
                      >
                        {conditionsCount > 0 ? (
                          <IconText
                            Icon={ConditionsFile}
                            label={conditionsCount}
                            color={colorScheme === 'dark' ? colors.white : colors.B60}
                          />
                        ) : (
                          <ConditionsFile />
                        )}
                      </ActionIconWithTooltip>
                      <DotsMenu onDelete={onDelete} onAddVariant={onAddVariant} />
                    </Group>
                  </When>
                </ContainerButton>
              </Group>
            </div>
            <Divider
              ml={-18}
              mr={-8}
              size={2}
              my={0}
              variant={'dashed'}
              color={colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
            />
          </When>

          <Group w="100%" noWrap>
            <LeftContainerWrapper>
              <DisplayPrimaryProviderIcon
                Icon={Icon}
                disabledProp={disabledProp}
                providerIntegration={providerIntegration}
                isChannelStep={isChannelStep}
                logoSrc={logoSrc}
              />

              <StyledContentWrapper>
                <Text {...disabledColor} weight="bold" rows={1} size={16} data-test-id="workflow-node-label">
                  {label}
                </Text>

                {Object.keys(stepErrorContent).length > 0 && (
                  <Text {...disabledColor} size={12} color={colors.error} rows={1} data-test-id="workflow-node-error">
                    {stepErrorContent}
                  </Text>
                )}
                {!(Object.keys(stepErrorContent).length > 0) && subtitle && (
                  <Text
                    {...disabledColor}
                    style={{ ...(!isVariant && showMenu && { maxWidth: 50 }) }}
                    size={12}
                    color={colors.B60}
                    rows={1}
                    data-test-id="workflow-node-subtitle"
                  >
                    {subtitle}
                  </Text>
                )}
              </StyledContentWrapper>
            </LeftContainerWrapper>

            <ActionWrapper>
              {action && !readonly && (
                <Switch checked={checked} onChange={(e) => switchButton && switchButton(e.target.checked)} />
              )}
              <When truthy={!isVariant && showMenu}>
                <ContainerButton mt={-40}>
                  <Group noWrap spacing={5}>
                    <ActionIconWithTooltip onClick={onEdit} label={'Edit step'}>
                      <PencilOutlined />
                    </ActionIconWithTooltip>
                    <ActionIconWithTooltip onClick={(e) => e.stopPropagation()} label={'Add conditions'}>
                      <ConditionPlus />
                    </ActionIconWithTooltip>
                    <DotsMenu onDelete={onDelete} onAddVariant={onAddVariant} />
                  </Group>
                </ContainerButton>
              </When>
            </ActionWrapper>
          </Group>
        </Stack>

        {!hasActiveIntegration && (
          <NodeErrorPopover
            opened={popoverOpened}
            withinPortal
            transition="rotate-left"
            transitionDuration={250}
            offset={theme.spacing.xs}
            target={<ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />}
            titleIcon={<ProviderMissing />}
            title={`${CHANNEL_TYPE_TO_STRING[channelKey]} provider is not connected`}
            content={
              'Please configure or activate a provider instance for the ' +
              CHANNEL_TYPE_TO_STRING[channelKey] +
              ' channel to send notifications over this node'
            }
            actionItem={
              <Button
                onClick={() => {
                  segment.track(TemplateEditorAnalyticsEnum.CONFIGURE_PROVIDER_POPOVER_CLICK);
                  setIntegrationsModalVisible(true);
                  setPopoverOpened(false);
                }}
              >
                Open integration store
              </Button>
            }
          />
        )}
        {hasActiveIntegration && !primaryIntegration && isPrimaryStep && (
          <NodeErrorPopover
            opened={popoverOpened}
            withinPortal
            transition="rotate-left"
            transitionDuration={250}
            offset={theme.spacing.xs}
            target={<ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />}
            titleIcon={<ProviderMissing />}
            title="Select primary provider"
            content={
              'You have multiple provider instances for' +
              CHANNEL_TYPE_TO_STRING[channelKey] +
              `in the ${environment?.name} environment. Please select the primary instance.
            `
            }
            actionItem={
              <Button
                onClick={() => {
                  segment.track(TemplateEditorAnalyticsEnum.CONFIGURE_PROVIDER_POPOVER_CLICK);
                  openSelectPrimaryIntegrationModal({
                    environmentId: environment?._id,
                    channelType: tabKey,
                    onClose: () => {},
                  });
                  setPopoverOpened(false);
                }}
              >
                Select primary provider
              </Button>
            }
          />
        )}
        {hasActiveIntegration && stepErrorContent && (
          <NodeErrorPopover
            withinPortal
            withArrow
            opened={popoverOpened && Object.keys(stepErrorContent).length > 0}
            transition="rotate-left"
            transitionDuration={250}
            offset={theme.spacing.xs}
            position="right"
            zIndex={4}
            positionDependencies={[dragging, viewport]}
            clickOutsideEvents={MENU_CLICK_OUTSIDE_EVENTS}
            target={<ErrorCircle data-test-id="error-circle" dark={theme.colorScheme === 'dark'} />}
            title={stepErrorContent || 'Something is missing here'}
            content={
              `Please specify a ${(stepErrorContent as string)
                .replace(/(is|are) missing!/g, '')
                .toLowerCase()} to prevent sending empty notifications.` || 'Something is missing here'
            }
          />
        )}
      </UnstyledButtonStyled>
      {isMultiProviderConfigurationEnabled ? (
        <IntegrationsListModal
          isOpen={isIntegrationsModalVisible}
          onClose={onIntegrationModalClose}
          scrollTo={tabKey}
        />
      ) : (
        <IntegrationsStoreModal
          openIntegration={isIntegrationsModalVisible}
          closeIntegration={onIntegrationModalClose}
          scrollTo={tabKey}
        />
      )}
      <SelectPrimaryIntegrationModal />
    </>
  );
}

const DotsMenu = ({ onDelete, onAddVariant }) => {
  return (
    <Dropdown
      withArrow={false}
      offset={0}
      control={
        <ActionIcon onClick={(e) => e.stopPropagation()} variant={'transparent'}>
          <DotsHorizontal />
        </ActionIcon>
      }
      middlewares={{ flip: false, shift: false }}
    >
      <Dropdown.Item
        icon={<VariantPlus />}
        onClick={(e) => {
          e.stopPropagation();
          onAddVariant();
        }}
      >
        Add variant
      </Dropdown.Item>
      <Dropdown.Item
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        icon={<Trash width="16px" height="16px" />}
        data-test-id="delete-step-action"
      >
        Delete step
      </Dropdown.Item>
    </Dropdown>
  );
};
const ActionIconWithTooltip = ({ label, onClick, children }) => {
  return (
    <Tooltip label={label}>
      <ActionIcon
        sx={(theme) => ({
          '&:hover': {
            background: theme.colorScheme === 'dark' ? colors.B40 : colors.B85,
            borderRadius: '8px',
          },
        })}
        variant={'transparent'}
        onClick={onClick}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
};
const IconText = ({ color, label, Icon }: { color?: string; label: any; Icon: React.FC<any> }) => {
  return (
    <Center inline>
      <Icon color={color} />
      <Text color={color} weight={'bold'} ml={5} size={14}>
        {label}
      </Text>
    </Center>
  );
};

const ContainerButton = styled(Container)`
  padding: 0;
  margin-left: auto;
  margin-right: 0;
`;
const ErrorCircle = styled.div<{ dark: boolean }>`
  width: 11px;
  height: 11px;
  display: inline-block;
  position: absolute;
  right: -6px;
  top: calc(50% - 4px);
  background: ${colors.error};
  border-radius: 50%;
  border: 3px solid ${({ dark }) => (dark ? colors.B15 : 'white')};
`;

const ActionWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const LeftContainerWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1 1 auto;
  height: 80px;
`;

const StyledContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  justify-content: flex-start;
  width: 100%;
  flex: 1;
`;

const UnstyledButtonStyled = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  pointer-events: all;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B17 : colors.white)};
  width: 280px;
`;
