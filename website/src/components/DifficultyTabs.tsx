import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

export function DifficultyTabs({ easy, hard }: { easy: React.ReactNode; hard: React.ReactNode }) {
  return (
    <Tabs>
      <TabItem value="easy" label="🟢 Easy — Click Around">
        {easy}
      </TabItem>
      <TabItem value="hard" label="🔵 Advanced — API / Code">
        {hard}
      </TabItem>
    </Tabs>
  );
}
